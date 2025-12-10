// src/modules/status/status.service.ts
import { Injectable } from '@nestjs/common';

import { GetStatusDtoResponse } from './dto/get-status.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatusService {
  constructor(private prisma: PrismaService) {}

  async check(): Promise<GetStatusDtoResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
