// import { QueueModule } from './modules/queue/queue.module';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import basicAuth from 'express-basic-auth';

import { BusinessVerificationGuard } from './common/guards/business-verification.guard';
import { LogRetentionService } from './common/services/logger/log-retention.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessHoursModule } from './modules/business-hours/business-hours.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SavedBusinessesModule } from './modules/saved-businesses/saved-businesses.module';
import { StatusModule } from './modules/status/status.module';
import { UploadSessionsModule } from './modules/upload-sessions/upload-sessions.module';
import { UsersModule } from './modules/users/users.module';
import { VerificationFilesModule } from './modules/verification-files/verification-files.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      middleware: basicAuth({
        challenge: true,
        users: { admin: process.env.BULL_BOARD_PASSWORD || 'Hhghgs2w878!!hsdggQQ' },
      }),
    }),
    PrismaModule,
    UsersModule,
    StatusModule,
    FirebaseModule,
    AuthModule,
    BusinessHoursModule,
    CategoriesModule,
    OnboardingModule,
    StorageModule,
    UploadSessionsModule,
    VerificationFilesModule,
    SavedBusinessesModule,
  ],
  providers: [
    LogRetentionService,
    {
      provide: APP_GUARD,
      useClass: BusinessVerificationGuard,
    },
  ],
})
export class AppModule {}
