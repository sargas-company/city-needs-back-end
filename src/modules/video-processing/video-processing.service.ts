import { execFile } from 'child_process';
import { createReadStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VideoProcessingStatus } from '@prisma/client';
import { Queue } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

const execFileAsync = promisify(execFile);

const MAX_DURATION_SECONDS = 60;
const FFMPEG_TIMEOUT_MS = 2 * 60 * 1000;
const STUCK_UPLOADED_THRESHOLD_MS = 5 * 60 * 1000;

type ProbeResult = {
  duration: number;
  width: number;
  height: number;
};

@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('video-processing')
    private readonly queue: Queue,
  ) {}

  // ==========================================
  // QUEUE
  // ==========================================

  async enqueue(videoId: string): Promise<void> {
    await this.queue.add(
      'process',
      { videoId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Video ${videoId} enqueued`);
  }

  // ==========================================
  // CRON: recover stuck UPLOADED videos
  // ==========================================

  @Cron(CronExpression.EVERY_5_MINUTES)
  async recoverStuckUploaded(): Promise<void> {
    this.logger.debug('recoverStuckUploaded cron tick');
    const threshold = new Date(Date.now() - STUCK_UPLOADED_THRESHOLD_MS);

    const stuck = await this.prisma.businessVideo.findMany({
      where: {
        processingStatus: VideoProcessingStatus.UPLOADED,
        updatedAt: { lt: threshold },
      },
      select: { id: true },
    });

    if (stuck.length === 0) return;

    this.logger.warn(`Found ${stuck.length} stuck UPLOADED video(s), re-enqueuing`);

    for (const video of stuck) {
      await this.enqueue(video.id).catch((err) => {
        this.logger.error(`Failed to re-enqueue video ${video.id}: ${String(err)}`);
      });
    }
  }

  // ==========================================
  // PROCESSING
  // ==========================================

  async processVideo(videoId: string): Promise<void> {
    this.logger.log(`processVideo started for videoId=${videoId}`);

    // Atomic transition (accept PROCESSING too for stalled job retries)
    const updated = await this.prisma.businessVideo.updateMany({
      where: {
        id: videoId,
        processingStatus: {
          in: [VideoProcessingStatus.UPLOADED, VideoProcessingStatus.PROCESSING],
        },
      },
      data: { processingStatus: VideoProcessingStatus.PROCESSING },
    });

    if (updated.count === 0) {
      this.logger.warn(`Video ${videoId}: not in UPLOADED or PROCESSING state, skipping`);
      return;
    }

    const video = await this.prisma.businessVideo.findUniqueOrThrow({
      where: { id: videoId },
      include: { videoFile: true, business: { select: { id: true } } },
    });

    const rawStorageKey = video.videoFile.storageKey;
    if (!rawStorageKey) {
      await this.setFailed(videoId);
      this.logger.error(`Video ${videoId}: missing storageKey`);
      return;
    }

    let tempDir: string | null = null;

    try {
      tempDir = await mkdtemp(join(tmpdir(), 'vidproc-'));

      const rawPath = join(tempDir, 'raw.mp4');
      const processedPath = join(tempDir, 'processed.mp4');
      const thumbnailPath = join(tempDir, 'thumbnail.jpg');

      // 1️⃣ Download raw
      await this.storage.downloadToFile(rawStorageKey, rawPath);

      // 2️⃣ Probe original
      const originalProbe = await this.probe(rawPath);
      if (!originalProbe) {
        throw new Error('Invalid video stream');
      }

      if (originalProbe.duration > MAX_DURATION_SECONDS) {
        throw new Error('Video exceeds max duration');
      }

      // 3️⃣ Transcode
      await this.transcode(rawPath, processedPath);

      // 4️⃣ Thumbnail
      const seek = Math.min(1, originalProbe.duration);
      await this.generateThumbnail(processedPath, thumbnailPath, seek);

      // 5️⃣ Probe processed
      const processedProbe = await this.probe(processedPath);
      if (!processedProbe) {
        throw new Error('Processed probe failed');
      }

      const businessId = video.business.id;

      const processedKey = `public/business/${businessId}/video/${videoId}/processed.mp4`;
      const thumbnailKey = `public/business/${businessId}/video/${videoId}/thumbnail.jpg`;

      // 6️⃣ Upload processed
      const processedUpload = await this.storage.uploadPublic({
        storageKey: processedKey,
        contentType: 'video/mp4',
        body: createReadStream(processedPath),
      });

      const thumbnailUpload = await this.storage.uploadPublic({
        storageKey: thumbnailKey,
        contentType: 'image/jpeg',
        body: createReadStream(thumbnailPath),
      });

      // 7️⃣ DB update
      await this.prisma.businessVideo.update({
        where: { id: videoId },
        data: {
          processingStatus: VideoProcessingStatus.READY,
          processedUrl: processedUpload.publicUrl,
          thumbnailUrl: thumbnailUpload.publicUrl,
          durationSeconds: Math.round(originalProbe.duration),
          width: processedProbe.width,
          height: processedProbe.height,
        },
      });

      // 8️⃣ Delete raw
      await this.storage.deleteObject(rawStorageKey).catch(() => undefined);

      this.logger.log(`Video ${videoId} processed successfully`);
    } catch (err) {
      await this.setFailed(videoId, rawStorageKey);
      this.logger.error(`Video ${videoId} failed`, (err as Error)?.stack ?? String(err));
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async probe(filePath: string): Promise<ProbeResult | null> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      const data = JSON.parse(stdout);
      const stream = (data.streams ?? []).find(
        (s: { codec_type?: string }) => s.codec_type === 'video',
      );

      if (!stream) return null;

      const width = Number(stream.width);
      const height = Number(stream.height);
      const duration = Number(data.format?.duration);

      if (!width || !height || !Number.isFinite(duration) || duration <= 0) return null;

      return { duration, width, height };
    } catch {
      return null;
    }
  }

  private async transcode(input: string, output: string): Promise<void> {
    await execFileAsync(
      'ffmpeg',
      [
        '-i',
        input,
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-profile:v',
        'high',
        '-level',
        '4.0',
        '-crf',
        '23',
        '-vf',
        'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        '-y',
        output,
      ],
      { timeout: FFMPEG_TIMEOUT_MS },
    );
  }

  private async generateThumbnail(input: string, output: string, seek: number): Promise<void> {
    await execFileAsync('ffmpeg', [
      '-i',
      input,
      '-ss',
      String(seek),
      '-vframes',
      '1',
      '-q:v',
      '2',
      '-y',
      output,
    ]);
  }

  private async setFailed(videoId: string, rawStorageKey?: string): Promise<void> {
    await this.prisma.businessVideo
      .update({
        where: { id: videoId },
        data: { processingStatus: VideoProcessingStatus.FAILED },
      })
      .catch(() => undefined);

    if (rawStorageKey) {
      await this.storage.deleteObject(rawStorageKey).catch(() => undefined);
    }
  }
}
