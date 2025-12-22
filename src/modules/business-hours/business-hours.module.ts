import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';

import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessHoursController],
  providers: [BusinessHoursService],
  exports: [BusinessHoursService],
})
export class BusinessHoursModule {}
