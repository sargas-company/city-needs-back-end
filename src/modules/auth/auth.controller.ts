// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Post, Headers, UseGuards } from '@nestjs/common';
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
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

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

  @Post('send-verification-email')
  @UseGuards(DbUserAuthGuard)
  async sendEmailVerification(
    @CurrentUser() user: User,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const authHeader = authorization ?? '';
    const [, idToken] = authHeader.split(' ');

    await this.emailVerificationService.sendVerificationEmail(user.id, idToken);

    return successResponse({
      data: null,
      message: 'Verification email sent',
    });
  }

  @Post('reset-password-request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.passwordResetService.requestPasswordReset(dto.email);

    return successResponse({
      data: null,
      message: 'If this email exists, a password reset link has been sent',
    });
  }
}
