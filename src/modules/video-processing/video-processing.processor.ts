import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';

import { PermanentProcessingError } from './errors/permanent-processing.error';
import { ReelProcessingService } from './reel-processing.service';
import { VideoProcessingService } from './video-processing.service';

type VideoJobPayload = { entity: 'businessVideo' | 'reel'; id: string };

/** @deprecated Old payload format kept for backward compatibility with jobs already in queue */
type LegacyJobPayload = { videoId: string };

@Processor('video-processing', {
  concurrency: Number(process.env.VIDEO_QUEUE_CONCURRENCY) || 1,
  limiter: {
    max: 5,
    duration: 1000,
  },
  lockDuration: 5 * 60 * 1000,
  stalledInterval: 60_000,
  maxStalledCount: 1,
})
export class VideoProcessingProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  constructor(
    private readonly videoService: VideoProcessingService,
    private readonly reelService: ReelProcessingService,
  ) {
    super();
  }

  // async process(job: Job<VideoJobPayload | LegacyJobPayload>): Promise<void> {
  //   await job.updateProgress(5);

  //   const { entity, id } = this.normalizePayload(job.data);

  //   if (entity === 'reel') {
  //     await this.reelService.processReel(id);
  //   } else {
  //     await this.videoService.processVideo(id);
  //   }

  //   await job.updateProgress(100);
  // }

  async process(job: Job<VideoJobPayload | LegacyJobPayload>): Promise<void> {
    await job.updateProgress(5);

    const { entity, id } = this.normalizePayload(job.data);

    if (entity === 'reel') {
      await this.reelService.processReel(id, job);
    } else {
      await this.videoService.processVideo(id, job);
    }

    await job.updateProgress(100);
  }

  async onModuleDestroy() {
    await this.worker.close();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<VideoJobPayload | LegacyJobPayload>, err: Error) {
    const { entity, id } = this.normalizePayload(job.data);
    const attempts = job.opts.attempts ?? 1;
    const isPermanent = err instanceof PermanentProcessingError;
    const isFinalAttempt = isPermanent || job.attemptsMade >= attempts;

    this.logger.error(
      `Job ${job.id} failed (attempt ${job.attemptsMade}/${attempts}${isPermanent ? ', permanent' : ''}): ${err.message}`,
    );

    if (isFinalAttempt) {
      if (isPermanent) {
        this.logger.warn(`Job ${job.id}: permanent error, marking ${entity} ${id} as FAILED`);
        job.discard();
      } else {
        this.logger.warn(`Job ${job.id}: all retries exhausted, marking ${entity} ${id} as FAILED`);
      }

      if (entity === 'reel') {
        await this.reelService.setFailed(id);
      } else {
        await this.videoService.setFailed(id);
      }
    }
  }

  private normalizePayload(data: VideoJobPayload | LegacyJobPayload): {
    entity: 'businessVideo' | 'reel';
    id: string;
  } {
    if ('entity' in data && data.entity) {
      return { entity: data.entity, id: data.id };
    }

    // Legacy format: { videoId: string }
    return { entity: 'businessVideo', id: (data as LegacyJobPayload).videoId };
  }
}
