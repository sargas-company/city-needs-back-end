import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { clerkClientProviders } from '../../common/providers/clerk-client.providers';
import { EmailService } from '../../common/services/email/email.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, EmailService, ...clerkClientProviders],
  exports: [UsersService],
})
export class UsersModule {}
