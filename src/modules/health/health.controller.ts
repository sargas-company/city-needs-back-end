import { Controller, Get } from '@nestjs/common';

import { RedisHealthService } from './redis-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redisHealth: RedisHealthService) {}

  @Get()
  async health() {
    const redis = await this.redisHealth.check();
    return {
      status: redis.redis === 'ok' ? 'ok' : 'degraded',
      ...redis,
    };
  }
}
