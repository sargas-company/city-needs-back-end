// src/modules/status/status.module.ts
import { Module } from '@nestjs/common';

import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
