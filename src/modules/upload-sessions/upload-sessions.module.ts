import { Module } from '@nestjs/common';

import { UploadSessionsController } from './upload-sessions.controller';
import { UploadSessionsService } from './upload-sessions.service';
import { DbUserAuthGuard } from '../../common/guards/db-user-auth.guard';
import { FirebaseModule } from '../../firebase/firebase.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [StorageModule, FirebaseModule, AuthModule, PrismaModule],
  controllers: [UploadSessionsController],
  providers: [UploadSessionsService, DbUserAuthGuard],
  exports: [UploadSessionsService],
})
export class UploadSessionsModule {}
