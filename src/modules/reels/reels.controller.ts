import {
  Controller,
  Delete,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { memoryStorage } from 'multer';

import { ReelsService } from './reels.service';
import {
  SwaggerGetMyReel,
  SwaggerReelsTag,
  SwaggerUpsertReel,
  SwaggerDeleteMyReel,
} from './reels.swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DbUserAuthGuard } from '../../common/guards/db-user-auth.guard';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Reels')
@ApiBearerAuth()
@Controller('/business/me/reel')
@SwaggerReelsTag()
@UseGuards(DbUserAuthGuard)
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Get()
  @SwaggerGetMyReel()
  async getMyReel(@CurrentUser() user: User) {
    const reel = await this.reelsService.getMyReel(user);
    return successResponse({ reel });
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @SwaggerUpsertReel()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadOrReplace(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    const reel = await this.reelsService.upsertReel(user, file);
    return successResponse({ reel }, 201);
  }

  @Delete()
  @SwaggerDeleteMyReel()
  async deleteMyReel(@CurrentUser() user: User) {
    await this.reelsService.deleteMyReel(user);
    return successResponse({ deleted: true });
  }
}
