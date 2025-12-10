// src/modules/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';

import { AuthSyncRequestDto } from './dto/auth-sync-request.dto';
import { UserDto } from './dto/user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sync user from Firebase:
   * - if not exists -> create
   * - if exists -> update soft fields (username, avatar), role only if null
   */
  async syncUser(
    firebaseUser: admin.auth.DecodedIdToken,
    payload: AuthSyncRequestDto,
  ): Promise<User> {
    const uid = firebaseUser.uid;

    if (!uid) {
      throw new BadRequestException('Firebase uid is missing');
    }

    const email = firebaseUser.email ?? null;
    const phone = (firebaseUser as any).phone_number ?? null;
    const firebaseName = (firebaseUser as any).name ?? null;
    const firebaseAvatar = (firebaseUser as any).picture ?? null;

    const existing = await this.prisma.user.findUnique({
      where: { authExternalId: uid },
    });

    const requestedRole = payload.role ?? null;
    if (requestedRole === UserRole.ADMIN) {
      throw new BadRequestException('Cannot set ADMIN role via auth sync');
    }

    if (!existing) {
      const data: Prisma.UserCreateInput = {
        authExternalId: uid,
        email,
        phone,
        username: payload.username ?? firebaseName,
        avatar: payload.avatar ?? firebaseAvatar,
        status: UserStatus.ACTIVE,
        role: requestedRole ?? UserRole.END_USER,
      };

      return this.prisma.user.create({ data });
    }

    if (existing.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('User is suspended');
    }

    if (existing.status === UserStatus.DELETED) {
      throw new ForbiddenException('User is deleted');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (payload.username !== undefined) {
      updateData.username = payload.username;
    } else if (!existing.username && firebaseName) {
      updateData.username = firebaseName;
    }

    if (payload.avatar !== undefined) {
      updateData.avatar = payload.avatar;
    } else if (!existing.avatar && firebaseAvatar) {
      updateData.avatar = firebaseAvatar;
    }

    if (existing.role === null && requestedRole) {
      updateData.role = requestedRole;
    }

    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    return this.prisma.user.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  async getUserByFirebaseUid(firebaseUser: admin.auth.DecodedIdToken): Promise<User> {
    const uid = firebaseUser.uid;
    if (!uid) {
      throw new BadRequestException('Firebase uid is missing');
    }

    const user = await this.prisma.user.findUnique({
      where: { authExternalId: uid },
    });

    if (!user) {
      throw new NotFoundException('User is not synced');
    }

    return user;
  }

  mapToUserDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
