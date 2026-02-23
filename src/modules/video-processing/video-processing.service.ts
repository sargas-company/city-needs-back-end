import { createReadStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VideoProcessingStatus } from '@prisma/client';
import { Job, Queue } from 'bullmq';

import { PermanentProcessingError } from './errors/permanent-processing.error';
import { MAX_DURATION_SECONDS, generateThumbnail, probe, transcode } from './ffmpeg.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

const STUCK_UPLOADED_THRESHOLD_MS = 5 * 60 * 1000;
const STUCK_PROCESSING_THRESHOLD_MS = 30 * 60 * 1000;

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
      { entity: 'businessVideo' as const, id: videoId },
      {
        jobId: `businessVideo-${videoId}`,
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
      orderBy: { updatedAt: 'asc' },
      take: 20,
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
  // CRON: recover stuck PROCESSING videos
  // ==========================================

  @Cron(CronExpression.EVERY_10_MINUTES)
  async recoverStuckProcessing(): Promise<void> {
    this.logger.debug('recoverStuckProcessing cron tick');
    const threshold = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS);

    const stuck = await this.prisma.businessVideo.findMany({
      where: {
        processingStatus: VideoProcessingStatus.PROCESSING,
        updatedAt: { lt: threshold },
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
      select: { id: true },
    });

    if (stuck.length === 0) return;

    this.logger.warn(`Found ${stuck.length} stuck PROCESSING video(s), re-enqueuing`);

    for (const video of stuck) {
      await this.enqueue(video.id).catch((err) => {
        this.logger.error(
          `Failed to re-enqueue stuck processing video ${video.id}: ${String(err)}`,
        );
      });
    }
  }

  // ==========================================
  // PROCESSING
  // ==========================================

  async processVideo(videoId: string, job: Job): Promise<void> {
    this.logger.log(`processVideo started for videoId=${videoId}`);

    // Atomic transition (accept PROCESSING too for stalled job retries)
    const now = new Date();

    const updated = await this.prisma.businessVideo.updateMany({
      where: {
        id: videoId,
        processingStatus: {
          in: [VideoProcessingStatus.UPLOADED, VideoProcessingStatus.PROCESSING],
        },
      },
      data: {
        processingStatus: VideoProcessingStatus.PROCESSING,
        processingStartedAt: now,
        lastError: null,
        ...(job.attemptsMade > 0 ? { retryCount: { increment: 1 } } : {}),
      },
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
      // Permanent error — no raw file to process, no point retrying
      throw new PermanentProcessingError(`Video ${videoId}: missing storageKey`);
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
      const originalProbe = await probe(rawPath);
      if (!originalProbe) {
        throw new PermanentProcessingError('Invalid video stream');
      }

      if (originalProbe.duration > MAX_DURATION_SECONDS) {
        throw new PermanentProcessingError('Video exceeds max duration');
      }

      // 3️⃣ Transcode
      await transcode(rawPath, processedPath);

      // 4️⃣ Thumbnail
      const seek = Math.min(1, originalProbe.duration);
      await generateThumbnail(processedPath, thumbnailPath, seek);

      // 5️⃣ Probe processed
      const processedProbe = await probe(processedPath);
      if (!processedProbe) {
        throw new PermanentProcessingError('Processed probe failed');
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
          processingFinishedAt: new Date(),
          lastError: null,
        },
      });

      // Update file record to point to processed video (raw will be deleted)
      await this.prisma.file.update({
        where: { id: video.videoFile.id },
        data: {
          url: processedUpload.publicUrl,
          storageKey: processedKey,
        },
      });

      // 8️⃣ Delete raw
      await this.storage.deleteObject(rawStorageKey).catch(() => undefined);

      this.logger.log(`Video ${videoId} processed successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await this.prisma.businessVideo
        .update({
          where: { id: videoId },
          data: {
            lastError: message,
            processingFinishedAt: new Date(),
          },
        })
        .catch(() => undefined);

      this.logger.error(`Video ${videoId} failed`, message);

      throw err;
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  // ==========================================
  // FINAL FAILURE (called by processor after all retries exhausted)
  // ==========================================

  async setFailed(videoId: string): Promise<void> {
    const video = await this.prisma.businessVideo
      .findUnique({
        where: { id: videoId },
        include: { videoFile: { select: { storageKey: true } } },
      })
      .catch(() => null);

    await this.prisma.businessVideo
      .update({
        where: { id: videoId },
        data: {
          processingStatus: VideoProcessingStatus.FAILED,
          processingFinishedAt: new Date(),
        },
      })
      .catch(() => undefined);

    if (video?.videoFile.storageKey) {
      await this.storage.deleteObject(video.videoFile.storageKey).catch(() => undefined);
    }

    this.logger.warn(`Video ${videoId} marked as FAILED, raw deleted`);
  }
}
