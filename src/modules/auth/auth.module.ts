import { Module } from '@nestjs/common';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { FirebaseAuthGuard } from 'src/common/guards/firebase-auth.guard';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaService } from 'src/prisma/prisma.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [FirebaseModule],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, FirebaseAuthGuard, DbUserAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
