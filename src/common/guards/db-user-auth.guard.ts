// src/common/guards/db-user-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { FirebaseService } from 'src/firebase/firebase.service';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class DbUserAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { firebaseUser?: admin.auth.DecodedIdToken; user?: User }>();

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

    const dbUser = await this.authService.getUserByFirebaseUid(firebaseUser);

    if (dbUser.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('User is suspended');
    }

    if (dbUser.status === UserStatus.DELETED) {
      throw new ForbiddenException('User is deleted');
    }

    request.user = dbUser;

    return true;
  }
}
