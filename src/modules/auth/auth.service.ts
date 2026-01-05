// src/modules/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, Prisma, User, UserRole, UserStatus } from '@prisma/client';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';

import { AuthMeDto, BusinessVerificationNextAction } from './dto/auth-me.dto';
import { AuthSyncRequestDto } from './dto/auth-sync-request.dto';
import { UserDto } from './dto/user.dto';

type MeLoadedUser = Prisma.UserGetPayload<{
  include: {
    business: {
      include: {
        address: true;
        logo: true;
        category: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<AuthMeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: {
          include: {
            address: true,
            logo: true,
            // We need requiresVerification/gracePeriodHours for gate computation,
            // but we will NOT expose them in BusinessDto.category
            category: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User is not synced');
    }

    const userDto = this.mapToUserDto(user);

    const business = user.business
      ? {
          id: user.business.id,
          name: user.business.name,
          description: user.business.description,
          phone: user.business.phone,
          email: user.business.email,
          status: user.business.status,
          categoryId: user.business.categoryId,
          verificationGraceDeadlineAt: user.business.verificationGraceDeadlineAt,
          addressId: user.business.addressId ?? null,
          address: user.business.address
            ? {
                id: user.business.address.id,
                countryCode: user.business.address.countryCode,
                city: user.business.address.city,
                state: user.business.address.state,
                addressLine1: user.business.address.addressLine1,
                addressLine2: user.business.address.addressLine2 ?? null,
                zip: user.business.address.zip ?? null,
              }
            : null,
          logoId: user.business.logoId ?? null,
          logo: user.business.logo
            ? {
                id: user.business.logo.id,
                url: user.business.logo.url,
                type: user.business.logo.type,
                mimeType: user.business.logo.mimeType ?? null,
                sizeBytes: user.business.logo.sizeBytes ?? null,
                originalName: user.business.logo.originalName ?? null,
              }
            : null,
          category: user.business.category
            ? {
                id: user.business.category.id,
                title: user.business.category.title,
                slug: user.business.category.slug,
                description: user.business.category.description ?? null,
              }
            : null,
        }
      : null;

    const verification = this.computeBusinessVerificationGate(user);

    return {
      user: userDto,
      business,
      verification,
    };
  }

  /**
   * Gate logic v1 (Stage 2):
   * - Uses business.category.requiresVerification + business.verificationGraceDeadlineAt + business.status
   * - No business_verifications history yet (WAIT_REVIEW/RESUBMIT later)
   */
  private computeBusinessVerificationGate(user: MeLoadedUser): AuthMeDto['verification'] {
    if (user.role !== UserRole.BUSINESS_OWNER) return null;
    if (!user.business) return null;

    const category = user.business.category;
    if (!category) {
      // should not happen if onboarding is correct
      return {
        requiresVerification: false,
        graceDeadlineAt: null,
        graceExpired: false,
        status: user.business.status,
        canUseApp: true,
        nextAction: BusinessVerificationNextAction.NONE,
      };
    }

    const requiresVerification = category.requiresVerification;

    if (!requiresVerification) {
      return {
        requiresVerification: false,
        graceDeadlineAt: null,
        graceExpired: false,
        status: user.business.status,
        canUseApp: true,
        nextAction: BusinessVerificationNextAction.NONE,
      };
    }

    // If approved/active => always can use
    if (user.business.status === BusinessStatus.ACTIVE) {
      return {
        requiresVerification: true,
        graceDeadlineAt: user.business.verificationGraceDeadlineAt ?? null,
        graceExpired: false,
        status: user.business.status,
        canUseApp: true,
        nextAction: BusinessVerificationNextAction.NONE,
      };
    }

    const deadline = user.business.verificationGraceDeadlineAt;
    const now = new Date();

    // If deadline is missing, treat as "immediate" (safe default)
    const graceExpired = !deadline ? true : now >= deadline;
    const canUseApp = !graceExpired;

    return {
      requiresVerification: true,
      graceDeadlineAt: deadline ?? null,
      graceExpired,
      status: user.business.status,
      canUseApp,
      nextAction: canUseApp
        ? BusinessVerificationNextAction.NONE
        : BusinessVerificationNextAction.GO_TO_VERIFICATION,
    };
  }

  /**
   * Sync user from Firebase:
   * - if not exists -> create
   * - if exists -> update soft fields (username, phone, emailVerified),
   *   role only if null; if role was null and becomes non-null -> onboardingStep = 1 (if null)
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
    const emailVerifiedFromFirebase = !!firebaseUser.email_verified;

    const normalizedPhone =
      payload.phone && payload.phone.trim() !== '' ? payload.phone.trim() : null;

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

      if (normalizedPhone) {
        const phoneOwner = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });
        if (phoneOwner) throw new ConflictException('Phone already in use');
      }

      const data: Prisma.UserCreateInput = {
        authExternalId: uid,
        email,
        phone: normalizedPhone,
        username: payload.username ?? firebaseName,
        status: UserStatus.ACTIVE,
        emailVerified: emailVerifiedFromFirebase,
        ...(requestedRole ? { role: requestedRole } : {}),
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

    if (existing.role === null && requestedRole) {
      updateData.role = requestedRole;

      if (existing.onboardingStep === null) {
        updateData.onboardingStep = 1;
      }
    }

    if (existing.phone === null && normalizedPhone) {
      const phoneOwner = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (phoneOwner && phoneOwner.id !== existing.id) {
        throw new ConflictException('Phone already in use');
      }
      updateData.phone = normalizedPhone;
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
      avatar: user.avatarId,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastVerificationEmailSentAt: user.lastVerificationEmailSentAt,
      onboardingStep: user.onboardingStep,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
