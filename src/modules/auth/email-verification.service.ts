// src/modules/auth/email-verification.service.ts
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getCooldownSeconds(): number {
    return Number(this.configService.get('EMAIL_VERIFICATION_COOLDOWN_SECONDS') ?? 600);
  }

  private getFirebaseApiKey(): string {
    const key = this.configService.get<string>('FIREBASE_API_KEY');
    if (!key) {
      throw new BadRequestException('FIREBASE_API_KEY is not configured');
    }
    return key;
  }

  private getContinueUrl(): string {
    const url = this.configService.get<string>('FRONTEND_EMAIL_VERIFIED_URL');
    if (!url) {
      throw new BadRequestException('FRONTEND_EMAIL_VERIFIED_URL is not configured');
    }
    return url;
  }

  async sendVerificationEmail(userId: string, idToken: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    const cooldownSeconds = this.getCooldownSeconds();

    if (user.lastVerificationEmailSentAt) {
      const last = user.lastVerificationEmailSentAt.getTime();
      const now = Date.now();
      const diffSeconds = Math.floor((now - last) / 1000);

      if (diffSeconds < cooldownSeconds) {
        throw new HttpException(
          'Verification email was sent recently. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const firebaseApiKey = this.getFirebaseApiKey();
    const continueUrl = this.getContinueUrl();

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`;

    const payload = {
      requestType: 'VERIFY_EMAIL',
      idToken,
      continueUrl,
    };

    try {
      await firstValueFrom(this.http.post(url, payload));

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastVerificationEmailSentAt: new Date(),
        },
      });
    } catch {
      throw new BadRequestException('Failed to send verification email');
    }
  }
}
