// import { ImageModule } from './modules/images/image.module';
// import { QueueModule } from './modules/queue/queue.module';
// import { StripeModule } from './modules/stripe/stripe.module';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import basicAuth from 'express-basic-auth';

import { ClerkAuthGuard } from './common/guards/clerk-auth.guard';
import { clerkClientProviders } from './common/providers/clerk-client.providers';
import { LogRetentionService } from './common/services/logger/log-retention.service';
import { StatusModule } from './modules/status/status.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

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
  ],
  providers: [
    ...clerkClientProviders,
    LogRetentionService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
