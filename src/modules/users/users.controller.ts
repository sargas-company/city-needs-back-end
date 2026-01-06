import {
  Body,
  Controller,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentFirebaseUser } from 'src/common/decorators/current-firebase-user.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

import type { auth } from 'firebase-admin';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(DbUserAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('me/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async updateMyAvatar(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    const result = await this.usersService.updateAvatar(user, file);

    return successResponse({
      data: result,
      message: 'Avatar updated successfully',
    });
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: User,
    @CurrentFirebaseUser() firebaseUser: auth.DecodedIdToken,
    @Body() dto: UpdateMeDto,
  ) {
    const updated = await this.usersService.updateMe(user, firebaseUser, dto);

    return successResponse({
      data: updated,
      message: 'Profile updated successfully',
    });
  }
}
