// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import * as admin from 'firebase-admin';
import { CurrentFirebaseUser } from 'src/common/decorators/current-firebase-user.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { FirebaseAuthGuard } from 'src/common/guards/firebase-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { AuthService } from './auth.service';
import { SwaggerAuthMe, SwaggerAuthSync } from './auth.swagger';
import { AuthSyncRequestDto } from './dto/auth-sync-request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @UseGuards(FirebaseAuthGuard)
  @SwaggerAuthSync()
  async sync(
    @CurrentFirebaseUser() firebaseUser: admin.auth.DecodedIdToken,
    @Body() body: AuthSyncRequestDto,
  ) {
    const user = await this.authService.syncUser(firebaseUser, body);
    const dto = this.authService.mapToUserDto(user);

    return successResponse({
      data: dto,
      message: 'User synced successfully',
    });
  }

  @Get('me')
  @UseGuards(DbUserAuthGuard)
  @SwaggerAuthMe()
  async me(@CurrentUser() user: User) {
    const dto = this.authService.mapToUserDto(user);

    return successResponse({
      data: dto,
      message: 'Current user info',
    });
  }
}
