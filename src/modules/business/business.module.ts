// src/modules/business/business.module.ts
import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { BusinessHoursService } from 'src/modules/business-hours/business-hours.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageModule } from 'src/storage/storage.module';

import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';

@Module({
  imports: [FirebaseModule, StorageModule],
  controllers: [BusinessController],
  providers: [BusinessService, PrismaService, BusinessHoursService],
  exports: [BusinessService],
})
export class BusinessModule {}
