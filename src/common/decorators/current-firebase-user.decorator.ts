// src/modules/auth/decorators/current-firebase-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as admin from 'firebase-admin';

export const CurrentFirebaseUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): admin.auth.DecodedIdToken | undefined => {
    const request = ctx.switchToHttp().getRequest<{ firebaseUser?: admin.auth.DecodedIdToken }>();
    return request.firebaseUser;
  },
);
