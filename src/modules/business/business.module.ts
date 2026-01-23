// src/modules/business/business.module.ts
import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { BusinessHoursService } from 'src/modules/business-hours/business-hours.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageModule } from 'src/storage/storage.module';

import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { BusinessPublicController } from './public/business-public.controller';
import { BusinessPublicService } from './public/business-public.service';
import { BusinessPublicServicesController } from './services/business-public-services.controller';
import { BusinessServicesController } from './services/business-services.controller';
import { BusinessServicesService } from './services/business-services.service';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [FirebaseModule, StorageModule, AvailabilityModule],
  controllers: [
    BusinessController,
    BusinessServicesController,
    BusinessPublicServicesController,
    BusinessPublicController,
  ],
  providers: [
    BusinessService,
    PrismaService,
    BusinessHoursService,
    BusinessServicesService,
    BusinessPublicService,
  ],
  exports: [BusinessService],
})
export class BusinessModule {}
