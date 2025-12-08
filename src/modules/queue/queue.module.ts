import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'default',
    }),
  ],
  providers: [],
  exports: [],
})
export class QueueModule {}
