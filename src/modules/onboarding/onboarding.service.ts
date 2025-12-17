import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  AddressPayloadDto,
  BusinessProfilePayloadDto,
  CategoriesPayloadDto,
  OnboardingSubmitDto,
} from './dto/onboarding-submit.dto';
import { OnboardingAction, OnboardingStatus } from './types/onboarding.types';
import { UploadSessionsService } from '../upload-sessions/upload-sessions.service';

type LoadedUser = Prisma.UserGetPayload<{
  include: {
    business: { select: { id: true; addressId: true; logoId: true } };
  };
}>;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadSessions: UploadSessionsService,
  ) {}

  async submit(dbUser: User, dto: OnboardingSubmitDto) {
    const uid = dbUser.authExternalId;
    if (!uid) throw new BadRequestException('Firebase uid is missing');

    const user = await this.loadUser(uid);

    if (user.status === UserStatus.SUSPENDED) throw new ForbiddenException('User is suspended');
    if (user.status === UserStatus.DELETED) throw new ForbiddenException('User is deleted');

    if (user.role === null) {
      throw new ConflictException('User role is not selected. Call /auth/sync with role first.');
    }

    const payload = this.normalizePayload(dto.payload);
    const status = this.computeStatus(user);

    if (!status.allowedActions.includes(dto.action)) {
      throw new ConflictException(
        `Action ${dto.action} is not allowed in current onboarding state. Current action: ${status.allowedActions[0]}`,
      );
    }

    if (dto.action === OnboardingAction.BUSINESS_FILES) {
      await this.handleBusinessFiles(dbUser);
    } else if (dto.action === OnboardingAction.BUSINESS_FILES_SKIP) {
      await this.handleBusinessFilesSkip(dbUser);
    } else {
      await this.prisma.$transaction(async (tx) => {
        switch (dto.action) {
          case OnboardingAction.CUSTOMER_ADDRESS:
            await this.handleCustomerAddress(tx, user, payload);
            return;

          case OnboardingAction.CUSTOMER_CATEGORIES:
            await this.handleCustomerCategories(tx, user, payload);
            return;

          case OnboardingAction.BUSINESS_PROFILE:
            await this.handleBusinessProfile(tx, user, payload);
            return;

          case OnboardingAction.BUSINESS_ADDRESS:
            await this.handleBusinessAddress(tx, user, payload);
            return;

          default:
            throw new BadRequestException('Unknown onboarding action');
        }
      });
    }

    const reloaded = await this.loadUser(uid);
    const nextStatus = this.computeStatus(reloaded);

    return {
      user: {
        id: reloaded.id,
        role: reloaded.role,
        onboardingStep: reloaded.onboardingStep,
        addressId: reloaded.addressId,
        businessId: reloaded.business?.id ?? null,
      },
      onboarding: nextStatus,
    };
  }

  // State / Status

  private computeStatus(user: LoadedUser): OnboardingStatus {
    if (user.role === null) {
      return {
        isCompleted: false,
        role: null,
        currentStep: null,
        totalSteps: null,
        allowedActions: [],
        requiredScreen: OnboardingAction.CUSTOMER_ADDRESS,
      };
    }

    const totalSteps = user.role === UserRole.END_USER ? 2 : 3;

    if (user.onboardingStep === null) {
      return {
        isCompleted: true,
        role: user.role,
        currentStep: null,
        totalSteps,
        allowedActions: [],
        requiredScreen:
          user.role === UserRole.END_USER
            ? OnboardingAction.CUSTOMER_CATEGORIES
            : OnboardingAction.BUSINESS_FILES,
      };
    }

    // END_USER
    if (user.role === UserRole.END_USER) {
      if (user.onboardingStep === 1) {
        return {
          isCompleted: false,
          role: user.role,
          currentStep: 1,
          totalSteps,
          allowedActions: [OnboardingAction.CUSTOMER_ADDRESS],
          requiredScreen: OnboardingAction.CUSTOMER_ADDRESS,
        };
      }

      if (user.onboardingStep === 2) {
        if (!user.addressId) {
          return {
            isCompleted: false,
            role: user.role,
            currentStep: 1,
            totalSteps,
            allowedActions: [OnboardingAction.CUSTOMER_ADDRESS],
            requiredScreen: OnboardingAction.CUSTOMER_ADDRESS,
          };
        }

        return {
          isCompleted: false,
          role: user.role,
          currentStep: 2,
          totalSteps,
          allowedActions: [OnboardingAction.CUSTOMER_CATEGORIES],
          requiredScreen: OnboardingAction.CUSTOMER_CATEGORIES,
        };
      }
    }

    // BUSINESS_OWNER
    if (user.role === UserRole.BUSINESS_OWNER) {
      if (user.onboardingStep === 1) {
        return {
          isCompleted: false,
          role: user.role,
          currentStep: 1,
          totalSteps,
          allowedActions: [OnboardingAction.BUSINESS_PROFILE],
          requiredScreen: OnboardingAction.BUSINESS_PROFILE,
        };
      }

      if (user.onboardingStep === 2) {
        if (!user.business?.id) {
          return {
            isCompleted: false,
            role: user.role,
            currentStep: 1,
            totalSteps,
            allowedActions: [OnboardingAction.BUSINESS_PROFILE],
            requiredScreen: OnboardingAction.BUSINESS_PROFILE,
          };
        }

        return {
          isCompleted: false,
          role: user.role,
          currentStep: 2,
          totalSteps,
          allowedActions: [OnboardingAction.BUSINESS_ADDRESS],
          requiredScreen: OnboardingAction.BUSINESS_ADDRESS,
        };
      }

      if (user.onboardingStep === 3) {
        if (!user.business?.id) {
          return {
            isCompleted: false,
            role: user.role,
            currentStep: 1,
            totalSteps,
            allowedActions: [OnboardingAction.BUSINESS_PROFILE],
            requiredScreen: OnboardingAction.BUSINESS_PROFILE,
          };
        }

        return {
          isCompleted: false,
          role: user.role,
          currentStep: 3,
          totalSteps,
          allowedActions: [OnboardingAction.BUSINESS_FILES, OnboardingAction.BUSINESS_FILES_SKIP],
          requiredScreen: OnboardingAction.BUSINESS_FILES,
        };
      }
    }

    // fallback unexpected step
    return {
      isCompleted: false,
      role: user.role,
      currentStep: user.onboardingStep,
      totalSteps,
      allowedActions: [],
      requiredScreen:
        user.role === UserRole.END_USER
          ? OnboardingAction.CUSTOMER_ADDRESS
          : OnboardingAction.BUSINESS_PROFILE,
    };
  }

  // HANDLERS

  private async handleCustomerAddress(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    const dto = await this.validatePayload(AddressPayloadDto, payload);

    if (dto.countryCode !== 'CA') {
      throw new BadRequestException('Only CA countryCode is supported for now');
    }

    if (user.addressId) {
      await tx.user.update({
        where: { id: user.id },
        data: { onboardingStep: 2 },
      });
      return;
    }

    const address = await tx.address.create({
      data: {
        countryCode: dto.countryCode,
        city: dto.city,
        state: dto.state,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        zip: dto.zip ?? null,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        addressId: address.id,
        onboardingStep: 2,
      },
    });
  }

  private async handleCustomerCategories(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    const dto = await this.validatePayload(CategoriesPayloadDto, payload);

    if (!user.addressId) {
      throw new ConflictException('Address is required before selecting categories');
    }

    const found = await tx.category.count({ where: { id: { in: dto.categoryIds } } });
    if (found !== dto.categoryIds.length) {
      throw new BadRequestException('Some categories do not exist');
    }

    await tx.userCategory.deleteMany({ where: { userId: user.id } });
    await tx.userCategory.createMany({
      data: dto.categoryIds.map((categoryId) => ({ userId: user.id, categoryId })),
      skipDuplicates: true,
    });

    await tx.user.update({
      where: { id: user.id },
      data: { onboardingStep: null },
    });
  }

  private async handleBusinessProfile(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    const dto = await this.validatePayload(BusinessProfilePayloadDto, payload);

    const found = await tx.category.count({ where: { id: { in: dto.categoryIds } } });
    if (found !== dto.categoryIds.length) {
      throw new BadRequestException('Some categories do not exist');
    }

    if (user.business?.id) {
      await tx.user.update({
        where: { id: user.id },
        data: { onboardingStep: 2 },
      });
      return;
    }

    const business = await tx.business.create({
      data: {
        ownerUserId: user.id,
        name: dto.name,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
      },
    });

    await tx.businessCategory.createMany({
      data: dto.categoryIds.map((categoryId) => ({ businessId: business.id, categoryId })),
      skipDuplicates: true,
    });

    await tx.user.update({
      where: { id: user.id },
      data: { onboardingStep: 2 },
    });
  }

  private async handleBusinessAddress(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    const dto = await this.validatePayload(AddressPayloadDto, payload);

    if (dto.countryCode !== 'CA') {
      throw new BadRequestException('Only CA countryCode is supported for now');
    }

    const business = await tx.business.findUnique({
      where: { ownerUserId: user.id },
    });
    if (!business) throw new ConflictException('Business must be created before business address');

    if (business.addressId) {
      await tx.user.update({
        where: { id: user.id },
        data: { onboardingStep: 3 },
      });
      return;
    }

    const address = await tx.address.create({
      data: {
        countryCode: dto.countryCode,
        city: dto.city,
        state: dto.state,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        zip: dto.zip ?? null,
      },
    });

    await tx.business.update({
      where: { id: business.id },
      data: { addressId: address.id },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { onboardingStep: 3 },
    });
  }

  private async handleBusinessFiles(user: User) {
    await this.uploadSessions.commitDraftForOnboarding(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: null },
    });
  }

  private async handleBusinessFilesSkip(user: User) {
    await this.uploadSessions.abortDraft(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: null },
    });
  }

  // Helpers

  private async loadUser(firebaseUid: string): Promise<LoadedUser> {
    const user = await this.prisma.user.findUnique({
      where: { authExternalId: firebaseUid },
      include: {
        business: { select: { id: true, addressId: true, logoId: true } },
      },
    });

    if (!user) {
      throw new BadRequestException('User is not synced. Call /auth/sync first');
    }

    return user;
  }

  private normalizePayload(payload: any): any {
    if (payload === undefined || payload === null) return {};
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return payload;
      }
    }
    return payload;
  }

  private async validatePayload<T extends object>(cls: new () => T, payload: any): Promise<T> {
    const instance = plainToInstance(cls, payload ?? {});
    const errors = await validate(instance as any, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length) {
      throw new BadRequestException({
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: errors.map((e) => ({
          property: e.property,
          constraints: e.constraints,
        })),
      });
    }

    return instance;
  }
}
