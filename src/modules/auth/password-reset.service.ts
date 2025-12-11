// src/modules/auth/password-reset.service.ts
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getFirebaseApiKey(): string {
    const key = this.configService.get<string>('FIREBASE_API_KEY');
    if (!key) {
      this.logger.error('FIREBASE_API_KEY is not configured');
      throw new BadRequestException('FIREBASE_API_KEY is not configured');
    }
    return key;
  }

  async requestPasswordReset(email: string): Promise<void> {
    this.logger.debug(`requestPasswordReset called for email=${email}`, PasswordResetService.name);

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const firebaseApiKey = this.getFirebaseApiKey();

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`;

    const payload = {
      requestType: 'PASSWORD_RESET',
      email,
    };

    this.logger.debug(
      `Sending password reset email via Firebase for email=${email}`,
      PasswordResetService.name,
    );

    try {
      await firstValueFrom(this.http.post(url, payload));

      this.logger.log(
        `Password reset email sent successfully for email=${email}`,
        PasswordResetService.name,
      );
    } catch (error: any) {
      const firebaseError = error?.response?.data?.error?.message as string | undefined;

      if (firebaseError === 'EMAIL_NOT_FOUND') {
        this.logger.warn(
          `Password reset requested for non-existing email=${email} (Firebase EMAIL_NOT_FOUND)`,
          PasswordResetService.name,
        );
        return;
      }

      this.logger.error(
        `Failed to send password reset email for email=${email}, firebaseError=${firebaseError}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
        PasswordResetService.name,
      );

      throw new BadRequestException('Failed to send password reset email');
    }
  }
}
