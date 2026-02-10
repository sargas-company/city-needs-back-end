// src/modules/verification-files/verification-files.module.ts
import { Module } from '@nestjs/common';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageModule } from 'src/storage/storage.module';

import { FilesController } from './files.controller';
import { VerificationFilesController } from './verification-files.controller';
import { VerificationFilesService } from './verification-files.service';

@Module({
  imports: [PrismaModule, StorageModule, FirebaseModule, AuthModule],
  controllers: [VerificationFilesController, FilesController],
  providers: [VerificationFilesService, DbUserAuthGuard],
  exports: [VerificationFilesService],
})
export class VerificationFilesModule {}
