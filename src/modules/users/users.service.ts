import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByAuthExternalId(authExternalId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { authExternalId } });
  }

  async upsertFromAuthPayload(payload: {
    authExternalId: string;
    email?: string | null;
    phone?: string | null;
    username?: string | null;
    avatar?: string | null;
  }): Promise<User> {
    const { authExternalId, email, phone, username } = payload;

    return this.prisma.user.upsert({
      where: { authExternalId },
      create: {
        authExternalId,
        email: email ?? null,
        phone: phone ?? null,
        username: username ?? null,
        // avatar: avatar ?? null,
      },
      update: {
        email: email ?? undefined,
        phone: phone ?? undefined,
        username: username ?? undefined,
        // avatar: avatar ?? undefined,
      },
    });
  }
}
