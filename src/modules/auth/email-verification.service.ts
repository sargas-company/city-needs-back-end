// src/modules/auth/email-verification.service.ts
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getCooldownSeconds(): number {
    const value = this.configService.get('EMAIL_VERIFICATION_COOLDOWN_SECONDS');
    const cooldown = Number(value ?? 600);

    this.logger.debug(`Using email verification cooldown: ${cooldown} seconds (raw="${value}")`);

    return cooldown;
  }

  private getFirebaseApiKey(): string {
    const key = this.configService.get<string>('FIREBASE_API_KEY');
    if (!key) {
      throw new BadRequestException('FIREBASE_API_KEY is not configured');
    }
    return key;
  }

  async sendVerificationEmail(userId: string, idToken: string): Promise<void> {
    this.logger.debug(
      `sendVerificationEmail called for userId=${userId}`,
      EmailVerificationService.name,
    );

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

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`;

    const payload = {
      requestType: 'VERIFY_EMAIL',
      idToken,
    };

    this.logger.debug(
      `Sending verification email via Firebase for userId=${userId}`,
      EmailVerificationService.name,
    );

    try {
      await firstValueFrom(this.http.post(url, payload));

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastVerificationEmailSentAt: new Date(),
        },
      });

      this.logger.log(
        `Verification email sent and timestamp updated for userId=${userId}`,
        EmailVerificationService.name,
      );
    } catch {
      throw new BadRequestException('Failed to send verification email');
    }
  }
}
