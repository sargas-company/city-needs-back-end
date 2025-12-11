// src/modules/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';

import { AuthSyncRequestDto } from './dto/auth-sync-request.dto';
import { UserDto } from './dto/user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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
    this.logger.debug(`Sync user started`, AuthService.name);
    const uid = firebaseUser.uid;

    if (!uid) {
      this.logger.warn('Firebase uid is missing', AuthService.name);
      throw new BadRequestException('Firebase uid is missing');
    }

    const email = firebaseUser.email ?? null;
    const firebaseName = (firebaseUser as any).name ?? null;
    const firebaseAvatar = (firebaseUser as any).picture ?? null;
    const emailVerifiedFromFirebase = !!firebaseUser.email_verified;

    const existing = await this.prisma.user.findUnique({
      where: { authExternalId: uid },
    });

    const requestedRole = payload.role ?? null;
    if (requestedRole === UserRole.ADMIN) {
      this.logger.warn('Attempt to set ADMIN role via auth sync', AuthService.name);
      throw new BadRequestException('Cannot set ADMIN role via auth sync');
    }

    if (!existing) {
      this.logger.log(`Creating new user from Firebase uid=${uid}`, AuthService.name);
      const data: Prisma.UserCreateInput = {
        authExternalId: uid,
        email,
        phone: payload.phone ?? null,
        username: payload.username ?? firebaseName,
        avatar: payload.avatar ?? firebaseAvatar,
        status: UserStatus.ACTIVE,
        role: requestedRole ?? UserRole.END_USER,
        emailVerified: emailVerifiedFromFirebase,
      };

      const user = await this.prisma.user.create({ data });
      this.logger.log(
        `User created: id=${user.id}, uid=${uid}, role=${user.role}, emailVerified=${user.emailVerified}`,
        AuthService.name,
      );
      return user;
    }

    if (existing.status === UserStatus.SUSPENDED) {
      this.logger.warn(
        `Suspended user tried to sync: id=${existing.id}, uid=${uid}`,
        AuthService.name,
      );
      throw new ForbiddenException('User is suspended');
    }

    if (existing.status === UserStatus.DELETED) {
      this.logger.warn(
        `Deleted user tried to sync: id=${existing.id}, uid=${uid}`,
        AuthService.name,
      );
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

    if (existing.phone === null && payload.phone !== undefined) {
      updateData.phone = payload.phone;
    }

    if (emailVerifiedFromFirebase && !existing.emailVerified) {
      updateData.emailVerified = true;
    }

    const updatedFields = Object.keys(updateData);

    if (updatedFields.length === 0) {
      this.logger.debug(`User sync no-op: id=${existing.id}, uid=${uid}`, AuthService.name);
      return existing;
    }

    this.logger.debug(
      `Updating user: id=${existing.id}, uid=${uid}, fields=[${updatedFields.join(', ')}]`,
      AuthService.name,
    );

    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data: updateData,
    });

    this.logger.debug(`User updated successfully: id=${updated.id}, uid=${uid}`, AuthService.name);

    return updated;
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
      this.logger.warn(`Not synced user tried to get me: uid=${uid}`, AuthService.name);
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
      emailVerified: user.emailVerified,
      lastVerificationEmailSentAt: user.lastVerificationEmailSentAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
