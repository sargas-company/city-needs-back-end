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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { memoryStorage } from 'multer';

import { ReelsService } from './reels.service';
import {
  SwaggerGetMyReels,
  SwaggerReelsTag,
  SwaggerUploadReel,
  SwaggerDeleteReel,
} from './reels.swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DbUserAuthGuard } from '../../common/guards/db-user-auth.guard';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Reels')
@ApiBearerAuth()
@Controller('/business/me/reels')
@SwaggerReelsTag()
@UseGuards(DbUserAuthGuard)
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Get()
  @SwaggerGetMyReels()
  async getMyReels(@CurrentUser() user: User) {
    const reels = await this.reelsService.getMyReels(user);
    return successResponse({ reels });
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @SwaggerUploadReel()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadReel(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    const reel = await this.reelsService.createReel(user, file);
    return successResponse({ reel }, 201);
  }

  @Delete(':id')
  @SwaggerDeleteReel()
  async deleteReel(@CurrentUser() user: User, @Param('id') id: string) {
    await this.reelsService.deleteReel(user, id);
    return successResponse({ deleted: true });
  }
}
