import { tmpdir } from 'os';

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
import { diskStorage } from 'multer';

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
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${file.originalname}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadOrReplace(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    const reel = await this.reelsService.upsertReel(user, file);
    return successResponse({ reel }, 201);
  }

  @Delete(':reelId')
  @SwaggerDeleteMyReel()
  async deleteMyReel(@CurrentUser() user: User, @Param('reelId') reelId: string) {
    await this.reelsService.deleteMyReel(user, reelId);
    return successResponse({ deleted: true });
  }
}
