import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaModule } from 'src/prisma/prisma.module';

import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [BusinessHoursController],
  providers: [BusinessHoursService],
  exports: [BusinessHoursService],
})
export class BusinessHoursModule {}
