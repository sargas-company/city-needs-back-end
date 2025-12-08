import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { PASSWORD_PROTECTED_KEY } from '../decorators/password-protected.decorator';

@Injectable()
export class PasswordProtectedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPassword = this.reflector.getAllAndOverride<string>(PASSWORD_PROTECTED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPassword) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedPassword = request.headers['x-password'] || request.query.password;

    if (!providedPassword || providedPassword !== requiredPassword) {
      throw new UnauthorizedException('Invalid or missing password');
    }

    return true;
  }
}
