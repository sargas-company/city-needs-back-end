import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { FirebaseAuthGuard } from 'src/common/guards/firebase-auth.guard';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaService } from 'src/prisma/prisma.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [FirebaseModule, HttpModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    FirebaseAuthGuard,
    DbUserAuthGuard,
    EmailVerificationService,
    PasswordResetService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
