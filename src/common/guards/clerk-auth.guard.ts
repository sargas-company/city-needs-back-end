import { createClerkClient, verifyToken } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { UsersService } from '../../modules/users/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private reflector: Reflector,
    @Inject('ClerkClient') private readonly clerkClient: ReturnType<typeof createClerkClient>,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req: Request = ctx.switchToHttp().getRequest<Request>();
    const token = req.headers.authorization?.split(' ').pop();
    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const session = await verifyToken(token, {
        secretKey: this.config.get('CLERK_SECRET_KEY'),
      });

      const clerkUser = await this.clerkClient.users.getUser(session.sub);
      req['clerkUser'] = clerkUser;

      // req['dbUser'] =
      //   (await this.usersService.findByClerkId(clerkUser.id)) ??
      //   (await this.usersService.create(clerkUser.id, clerkUser.username || null));

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
