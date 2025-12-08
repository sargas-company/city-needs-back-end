import { createClerkClient, verifyToken } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class SSEAuthGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    @Inject('ClerkClient') private readonly clerkClient: ReturnType<typeof createClerkClient>,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: Request = ctx.switchToHttp().getRequest<Request>();
    const token = req.query.token as string;

    if (!token) {
      throw new UnauthorizedException('No token provided in query parameters');
    }

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
