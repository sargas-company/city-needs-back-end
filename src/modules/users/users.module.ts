import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule, FirebaseModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
