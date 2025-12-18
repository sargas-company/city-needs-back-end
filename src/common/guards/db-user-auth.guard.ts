import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { FirebaseService } from 'src/firebase/firebase.service';
import { PrismaService } from 'src/prisma/prisma.service';

import { AuthedRequestGate } from '../types/request-content.type';

@Injectable()
export class DbUserAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        firebaseUser?: admin.auth.DecodedIdToken;
        user?: any;
        gate?: AuthedRequestGate;
      }
    >();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    let firebaseUser: admin.auth.DecodedIdToken;
    try {
      firebaseUser = await this.firebaseService.getAuth().verifyIdToken(token, true);
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }

    request.firebaseUser = firebaseUser;

    const uid = firebaseUser.uid;
    if (!uid) {
      throw new UnauthorizedException('Invalid Firebase token payload');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { authExternalId: uid },
      include: {
        business: {
          select: {
            id: true,
            status: true,
            verificationGraceDeadlineAt: true,
            category: { select: { requiresVerification: true } },
          },
        },
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User is not synced');
    }

    if (dbUser.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('User is suspended');
    }

    if (dbUser.status === UserStatus.DELETED) {
      throw new ForbiddenException('User is deleted');
    }

    request.user = dbUser;

    request.gate = {
      role: dbUser.role,
      onboardingStep: dbUser.onboardingStep,
      business: {
        businessId: dbUser.business?.id ?? null,
        businessStatus: dbUser.business?.status ?? null,
        verificationGraceDeadlineAt: dbUser.business?.verificationGraceDeadlineAt ?? null,
        requiresVerification: dbUser.business?.category?.requiresVerification ?? null,
      },
    };

    return true;
  }
}
