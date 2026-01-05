import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PrismaService } from 'src/prisma/prisma.service';

import { SavedBusinessesController } from './saved-businesses.controller';
import { SavedBusinessesService } from './saved-businesses.service';

@Module({
  imports: [FirebaseModule],
  controllers: [SavedBusinessesController],
  providers: [SavedBusinessesService, PrismaService],
})
export class SavedBusinessesModule {}
