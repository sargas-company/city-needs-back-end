import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class RedisHealthService {
  constructor(
    @InjectQueue('video-processing')
    private readonly videoQueue: Queue,
  ) {}

  async check(): Promise<{ redis: 'ok' | 'down' }> {
    try {
      const client = await this.videoQueue.client;
      await client.ping();
      return { redis: 'ok' };
    } catch {
      return { redis: 'down' };
    }
  }
}
