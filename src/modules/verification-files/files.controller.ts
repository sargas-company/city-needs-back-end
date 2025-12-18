// src/modules/verification-files/files.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SkipBusinessVerification } from 'src/common/decorators/skip-business-verification.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { VerificationFilesService } from './verification-files.service';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('/files')
@UseGuards(DbUserAuthGuard)
@SkipBusinessVerification()
export class FilesController {
  constructor(private readonly service: VerificationFilesService) {}

  @Get(':id/signed-url')
  async getSignedUrl(@CurrentUser() user: User, @Param('id') fileId: string) {
    const result = await this.service.getSignedUrl(user, fileId);
    return successResponse({ ...result });
  }
}
