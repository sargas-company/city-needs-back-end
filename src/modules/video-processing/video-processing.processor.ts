import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';

import { VideoProcessingService } from './video-processing.service';

@Processor('video-processing', {
  concurrency: Number(process.env.VIDEO_QUEUE_CONCURRENCY) || 1,
})
export class VideoProcessingProcessor extends WorkerHost implements OnModuleDestroy {
  constructor(private readonly videoService: VideoProcessingService) {
    super();
  }

  async process(job: Job<{ videoId: string }>): Promise<void> {
    await job.updateProgress(5);

    await this.videoService.processVideo(job.data.videoId);

    await job.updateProgress(100);
  }

  async onModuleDestroy() {
    await this.worker.close();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.error(`Job ${job.id} failed:`, err.message);
  }
}
