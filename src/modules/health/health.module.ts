import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { RedisHealthService } from './redis-health.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [HealthController],
  providers: [RedisHealthService],
})
export class HealthModule {}
