// src/modules/reels/public/reels-public.module.ts

import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';

import { ReelsPublicController } from './reels-public.controller';
import { ReelsPublicService } from './reels-public.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [ReelsPublicController],
  providers: [ReelsPublicService],
})
export class ReelsPublicModule {}
