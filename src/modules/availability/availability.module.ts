// src/modules/availability/availability.module.ts
import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaModule } from 'src/prisma/prisma.module';

import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
