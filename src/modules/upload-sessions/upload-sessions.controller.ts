import {
  Body,
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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UploadItemKind, User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { SkipBusinessVerification } from 'src/common/decorators/skip-business-verification.decorator';

import { UploadFileDto } from './dto/upload-file.dto';
import { UploadSessionsService } from './upload-sessions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DbUserAuthGuard } from '../../common/guards/db-user-auth.guard';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Upload Sessions')
@ApiBearerAuth()
@Controller('/onboarding/upload-session')
@UseGuards(DbUserAuthGuard)
@SkipBusinessVerification()
export class UploadSessionsController {
  constructor(private readonly uploadSessionsService: UploadSessionsService) {}

  @Post()
  async getOrCreateDraft(@CurrentUser() user: User) {
    const session = await this.uploadSessionsService.getOrCreateDraft(user);
    return successResponse({ session }, 201);
  }

  @Get()
  async getDraft(@CurrentUser() user: User) {
    const session = await this.uploadSessionsService.getDraft(user);
    return successResponse({ session });
  }

  @Post('files')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['kind', 'file'],
      properties: {
        kind: {
          type: 'string',
          enum: Object.values(UploadItemKind),
          example: UploadItemKind.LOGO,
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadFile(
    @CurrentUser() user: User,
    @Body() dto: UploadFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const session = await this.uploadSessionsService.uploadFile(user, dto, file);
    return successResponse({ session }, 201);
  }

  @Delete('files/:fileId')
  async deleteFile(@CurrentUser() user: User, @Param('fileId') fileId: string) {
    const session = await this.uploadSessionsService.deleteFile(user, fileId);
    return successResponse({ session });
  }

  @Post('abort')
  async abort(@CurrentUser() user: User) {
    const result = await this.uploadSessionsService.abortDraft(user);
    return successResponse({ ...result });
  }
}
