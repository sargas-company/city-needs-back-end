import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';

import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { VideoProcessingModule } from '../video-processing/video-processing.module';

@Module({
  imports: [PrismaModule, StorageModule, FirebaseModule, VideoProcessingModule],
  controllers: [ReelsController],
  providers: [ReelsService],
})
export class ReelsModule {}
