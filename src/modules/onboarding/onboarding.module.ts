import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaService } from 'src/prisma/prisma.service';

import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, PrismaService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
