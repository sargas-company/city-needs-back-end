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
export class ReelProcessingService {
  private readonly logger = new Logger(ReelProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('video-processing')
    private readonly queue: Queue,
  ) {}

  // ==========================================
  // QUEUE
  // ==========================================

  async enqueue(reelId: string): Promise<void> {
    await this.queue.add(
      'process',
      { entity: 'reel' as const, id: reelId },
      {
        jobId: `reel-${reelId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Reel ${reelId} enqueued`);
  }

  // ==========================================
  // CRON: recover stuck UPLOADED reels
  // ==========================================

  @Cron(CronExpression.EVERY_5_MINUTES)
  async recoverStuckUploaded(): Promise<void> {
    this.logger.debug('recoverStuckUploaded (reels) cron tick');
    const threshold = new Date(Date.now() - STUCK_UPLOADED_THRESHOLD_MS);

    const stuck = await this.prisma.reel.findMany({
      where: {
        processingStatus: VideoProcessingStatus.UPLOADED,
        updatedAt: { lt: threshold },
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
      select: { id: true },
    });

    if (stuck.length === 0) return;

    this.logger.warn(`Found ${stuck.length} stuck UPLOADED reel(s), re-enqueuing`);

    for (const reel of stuck) {
      await this.enqueue(reel.id).catch((err) => {
        this.logger.error(`Failed to re-enqueue reel ${reel.id}: ${String(err)}`);
      });
    }
  }

  // ==========================================
  // CRON: recover stuck PROCESSING reels
  // ==========================================

  @Cron(CronExpression.EVERY_10_MINUTES)
  async recoverStuckProcessing(): Promise<void> {
    this.logger.debug('recoverStuckProcessing (reels) cron tick');

    const threshold = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS);

    const stuck = await this.prisma.reel.findMany({
      where: {
        processingStatus: VideoProcessingStatus.PROCESSING,
        updatedAt: { lt: threshold },
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
      select: { id: true },
    });

    if (stuck.length === 0) return;

    this.logger.warn(`Found ${stuck.length} stuck PROCESSING reel(s), re-enqueuing`);

    for (const reel of stuck) {
      await this.enqueue(reel.id).catch((err) => {
        this.logger.error(`Failed to re-enqueue stuck processing reel ${reel.id}: ${String(err)}`);
      });
    }
  }

  // ==========================================
  // PROCESSING
  // ==========================================

  async processReel(reelId: string, job: Job): Promise<void> {
    this.logger.log(`processReel started for reelId=${reelId}`);

    // Atomic transition (accept PROCESSING too for stalled job retries)
    const now = new Date();

    const updated = await this.prisma.reel.updateMany({
      where: {
        id: reelId,
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
      this.logger.warn(`Reel ${reelId}: not in UPLOADED or PROCESSING state, skipping`);
      return;
    }

    const reel = await this.prisma.reel.findUniqueOrThrow({
      where: { id: reelId },
      include: { video: true, business: { select: { id: true } } },
    });

    const rawStorageKey = reel.video.storageKey;
    if (!rawStorageKey) {
      // Permanent error — no raw file to process, no point retrying
      throw new PermanentProcessingError(`Reel ${reelId}: missing storageKey`);
    }

    let tempDir: string | null = null;

    try {
      tempDir = await mkdtemp(join(tmpdir(), 'reelproc-'));

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
        throw new PermanentProcessingError('Reel exceeds max duration');
      }

      // 4️⃣ Transcode
      await transcode(rawPath, processedPath);

      // 5️⃣ Thumbnail
      const seek = Math.min(1, originalProbe.duration);
      await generateThumbnail(processedPath, thumbnailPath, seek);

      // 6️⃣ Probe processed
      const processedProbe = await probe(processedPath);
      if (!processedProbe) {
        throw new PermanentProcessingError('Processed probe failed');
      }

      const businessId = reel.business.id;

      const processedKey = `public/business/${businessId}/reels/${reelId}/processed.mp4`;
      const thumbnailKey = `public/business/${businessId}/reels/${reelId}/thumbnail.jpg`;

      // 7️⃣ Upload processed
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

      // 8️⃣ DB update
      await this.prisma.reel.update({
        where: { id: reelId },
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
        where: { id: reel.video.id },
        data: {
          url: processedUpload.publicUrl,
          storageKey: processedKey,
        },
      });

      // 9️⃣ Delete raw
      await this.storage.deleteObject(rawStorageKey).catch(() => undefined);

      // 🔟 Two-phase cleanup: remove old READY reel(s) for the same business
      await this.cleanupOldReels(reelId, businessId);

      this.logger.log(`Reel ${reelId} processed successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await this.prisma.reel
        .update({
          where: { id: reelId },
          data: {
            lastError: message,
            processingFinishedAt: new Date(),
          },
        })
        .catch(() => undefined);

      this.logger.error(`Reel ${reelId} failed`, message);

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

  // ==========================================
  // FINAL FAILURE (called by processor after all retries exhausted)
  // ==========================================

  async setFailed(reelId: string): Promise<void> {
    const reel = await this.prisma.reel
      .findUnique({
        where: { id: reelId },
        include: { video: { select: { storageKey: true } } },
      })
      .catch(() => null);

    if (!reel) return;

    // Mark as FAILED (do not delete DB records)
    await this.prisma.reel
      .update({
        where: { id: reelId },
        data: {
          processingStatus: VideoProcessingStatus.FAILED,
          processingFinishedAt: new Date(),
        },
      })
      .catch((e) => {
        this.logger.error(`Failed to mark reel ${reelId} as FAILED: ${String(e)}`);
      });

    // Cleanup raw file from S3
    if (reel.video.storageKey) {
      await this.storage.deleteObject(reel.video.storageKey).catch((e) => {
        this.logger.warn(`Failed to delete raw S3 object for failed reel ${reelId}: ${String(e)}`);
      });
    }

    this.logger.warn(`Reel ${reelId} marked as FAILED (record preserved), raw deleted`);
  }

  // ==========================================
  // TWO-PHASE CLEANUP
  // ==========================================

  private async cleanupOldReels(currentReelId: string, businessId: string): Promise<void> {
    const oldReels = await this.prisma.reel.findMany({
      where: {
        businessId,
        id: { not: currentReelId },
        processingStatus: VideoProcessingStatus.READY,
      },
      include: { video: { select: { id: true, storageKey: true } } },
    });

    if (oldReels.length === 0) return;

    this.logger.log(`Cleaning up ${oldReels.length} old reel(s) for business ${businessId}`);

    // DB cleanup in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.reel.deleteMany({
        where: { id: { in: oldReels.map((r) => r.id) } },
      });
      await tx.file.deleteMany({
        where: { id: { in: oldReels.map((r) => r.video.id) } },
      });
    });

    // S3 cleanup after transaction (fire-and-forget)
    for (const old of oldReels) {
      if (old.video.storageKey) {
        this.storage
          .deleteObject(old.video.storageKey)
          .catch((e) =>
            this.logger.warn(`Failed to delete old reel raw: ${old.video.storageKey} ${String(e)}`),
          );
      }
      if (old.processedUrl) {
        const key = this.extractStorageKey(old.processedUrl);
        if (key) {
          this.storage
            .deleteObject(key)
            .catch((e) =>
              this.logger.warn(`Failed to delete old reel processed: ${key} ${String(e)}`),
            );
        }
      }
      if (old.thumbnailUrl) {
        const key = this.extractStorageKey(old.thumbnailUrl);
        if (key) {
          this.storage
            .deleteObject(key)
            .catch((e) =>
              this.logger.warn(`Failed to delete old reel thumbnail: ${key} ${String(e)}`),
            );
        }
      }
    }
  }

  private extractStorageKey(publicUrl: string): string | null {
    const idx = publicUrl.indexOf('public/');
    if (idx === -1) return null;
    return decodeURI(publicUrl.slice(idx));
  }
}
