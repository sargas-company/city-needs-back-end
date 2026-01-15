// src/modules/review/review.module.ts
import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaService } from 'src/prisma/prisma.service';

import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [FirebaseModule],
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
  exports: [ReviewService],
})
export class ReviewModule {}
