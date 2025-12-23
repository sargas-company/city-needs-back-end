import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { BusinessHoursModule } from 'src/modules/business-hours/business-hours.module';
import { PrismaService } from 'src/prisma/prisma.service';

import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { AuthModule } from '../auth/auth.module';
import { UploadSessionsModule } from '../upload-sessions/upload-sessions.module';

@Module({
  imports: [FirebaseModule, AuthModule, UploadSessionsModule, BusinessHoursModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, PrismaService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
