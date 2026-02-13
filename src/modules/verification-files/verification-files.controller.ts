// src/modules/verification-files/verification-files.controller.ts
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SkipBusinessVerification } from 'src/common/decorators/skip-business-verification.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import {
  CurrentVerificationFileDto,
  VerificationLockDto,
} from './dto/current-verification-file.dto';
import { GetCurrentVerificationFileResponseDto } from './dto/get-current-verification-file.response.dto';
import { VerificationFilesService } from './verification-files.service';
import { SwaggerGetCurrentVerificationFile } from './verification-files.swagger';

@ApiTags('Verification Files')
@ApiBearerAuth()
@ApiExtraModels(
  CurrentVerificationFileDto,
  VerificationLockDto,
  GetCurrentVerificationFileResponseDto,
)
@Controller('/onboarding/verification-file')
@UseGuards(DbUserAuthGuard)
@SkipBusinessVerification()
export class VerificationFilesController {
  constructor(private readonly service: VerificationFilesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    const saved = await this.service.uploadVerificationFile(user, file);
    return successResponse({ file: saved }, 201);
  }

  @Get('current')
  @SwaggerGetCurrentVerificationFile()
  async current(@CurrentUser() user: User) {
    const file = await this.service.getCurrentVerificationFile(user);
    return successResponse({ file });
  }

  @Delete(':id')
  async delete(@CurrentUser() user: User, @Param('id') fileId: string) {
    await this.service.deleteVerificationFile(user, fileId);
    return successResponse({ deleted: true });
  }
}
