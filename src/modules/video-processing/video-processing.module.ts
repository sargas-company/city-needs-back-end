import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ReelProcessingService } from './reel-processing.service';
import { VideoProcessingProcessor } from './video-processing.processor';
import { VideoProcessingService } from './video-processing.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'video-processing',
    }),
    BullBoardModule.forFeature({
      name: 'video-processing',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [VideoProcessingService, ReelProcessingService, VideoProcessingProcessor],
  exports: [VideoProcessingService, ReelProcessingService],
})
export class VideoProcessingModule {}
