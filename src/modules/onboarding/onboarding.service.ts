// src/modules/onboarding/onboarding.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  BusinessStatus,
  BusinessVerificationStatus,
  FileType,
  Prisma,
  User,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CITIES, City } from 'src/common/config/cities.config';
import { BusinessHoursService } from 'src/modules/business-hours/business-hours.service';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  AddressPayloadDto,
  BusinessProfilePayloadDto,
  CategoriesPayloadDto,
  OnboardingSubmitDto,
  BusinessVerificationSubmitPayloadDto,
} from './dto/onboarding-submit.dto';
import { OnboardingAction, OnboardingStatus } from './types/onboarding.types';
import { UploadSessionsService } from '../upload-sessions/upload-sessions.service';

type LoadedUser = Prisma.UserGetPayload<{
  include: {
    business: {
      select: {
        id: true;
        addressId: true;
        logoId: true;
        status: true;
        verificationGraceDeadlineAt: true;
        category: { select: { id: true; requiresVerification: true } };
      };
    };
  };
}>;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadSessions: UploadSessionsService,
    private readonly businessHours: BusinessHoursService,
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

          case OnboardingAction.BUSINESS_VERIFICATION_SUBMIT:
            await this.handleBusinessVerificationSubmit(tx, user, payload);
            return;

          case OnboardingAction.BUSINESS_VERIFICATION_SKIP:
            await this.handleBusinessVerificationSkip(tx, user);
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

    const totalSteps = user.role === UserRole.END_USER ? 2 : 4;

    if (user.onboardingStep === null) {
      return {
        isCompleted: true,
        role: user.role,
        currentStep: null,
        totalSteps,
        allowedActions: [],
        requiredScreen: null,
      };
    }

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

      if (user.onboardingStep === 4) {
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

        const requiresVerification = user.business?.category?.requiresVerification === true;
        const deadline = user.business?.verificationGraceDeadlineAt ?? null;
        const graceExpired = !deadline || deadline.getTime() <= Date.now();

        const skipAllowed = !(requiresVerification && graceExpired);

        const allowedActions: OnboardingAction[] = [OnboardingAction.BUSINESS_VERIFICATION_SUBMIT];
        if (skipAllowed) allowedActions.push(OnboardingAction.BUSINESS_VERIFICATION_SKIP);

        return {
          isCompleted: false,
          role: user.role,
          currentStep: 4,
          totalSteps,
          allowedActions,
          requiredScreen: OnboardingAction.BUSINESS_VERIFICATION_SUBMIT,
        };
      }
    }

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

    if (dto.countryCode !== 'CA') throw new BadRequestException('Only CA countryCode is supported');

    if (!(dto.city in CITIES)) {
      throw new BadRequestException(
        `Customer city must be one of: ${Object.keys(CITIES).join(', ')}`,
      );
    }

    const city = dto.city as City;
    const { state } = CITIES[city];

    if (user.addressId) {
      await tx.user.update({ where: { id: user.id }, data: { onboardingStep: 2 } });
      return;
    }

    const address = await tx.address.create({
      data: {
        countryCode: dto.countryCode,
        city: dto.city,
        state: state,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        zip: dto.zip ?? null,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { addressId: address.id, onboardingStep: 2 },
    });
  }

  private async handleCustomerCategories(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    const dto = await this.validatePayload(CategoriesPayloadDto, payload);

    if (!user.addressId) throw new ConflictException('Address is required before categories');

    const found = await tx.category.count({ where: { id: { in: dto.categoryIds } } });
    if (found !== dto.categoryIds.length)
      throw new BadRequestException('Some categories do not exist');

    await tx.userCategory.deleteMany({ where: { userId: user.id } });
    await tx.userCategory.createMany({
      data: dto.categoryIds.map((categoryId) => ({ userId: user.id, categoryId })),
      skipDuplicates: true,
    });

    await tx.user.update({ where: { id: user.id }, data: { onboardingStep: null } });
  }

  private async handleBusinessProfile(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    const dto = await this.validatePayload(BusinessProfilePayloadDto, payload);

    const category = await tx.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true, requiresVerification: true, gracePeriodHours: true },
    });
    if (!category) throw new BadRequestException('Category does not exist');

    let verificationGraceDeadlineAt: Date | null = null;
    if (category.requiresVerification) {
      verificationGraceDeadlineAt =
        category.gracePeriodHours === null
          ? new Date()
          : new Date(Date.now() + category.gracePeriodHours * 60 * 60 * 1000);
    }

    if (user.business?.id) {
      await tx.user.update({ where: { id: user.id }, data: { onboardingStep: 2 } });
      return;
    }

    const business = await tx.business.create({
      data: {
        ownerUserId: user.id,
        name: dto.name,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
        price: dto.price,
        categoryId: category.id,
        verificationGraceDeadlineAt,
      },
    });

    if (Array.isArray(dto.businessHours)) {
      await this.businessHours.setBusinessHoursTx(tx, business.id, dto.businessHours);
    }

    await tx.user.update({ where: { id: user.id }, data: { onboardingStep: 2 } });
  }

  private async handleBusinessAddress(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    const dto = await this.validatePayload(AddressPayloadDto, payload);

    if (dto.countryCode !== 'CA') {
      throw new BadRequestException('Only CA countryCode is supported');
    }

    if (!(dto.city in CITIES)) {
      throw new BadRequestException(
        `Business city must be one of: ${Object.keys(CITIES).join(', ')}`,
      );
    }

    if (typeof dto.lat !== 'number' || typeof dto.lng !== 'number') {
      throw new BadRequestException('Business location coordinates (lat/lng) are required');
    }

    const city = dto.city as City;
    const { timeZone, state } = CITIES[city];

    const business = await tx.business.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, addressId: true },
    });

    if (!business) {
      throw new ConflictException('Business must exist before business address');
    }

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
        city,
        state,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        zip: dto.zip ?? null,
      },
    });

    await tx.location.create({
      data: {
        businessId: business.id,
        lat: dto.lat,
        lng: dto.lng,
        source: 'manual',
      },
    });

    await tx.business.update({
      where: { id: business.id },
      data: {
        addressId: address.id,
        timeZone,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { onboardingStep: 3 },
    });
  }

  private async handleBusinessFiles(user: User) {
    await this.uploadSessions.commitDraftForOnboarding(user);

    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!business) {
      await this.prisma.user.update({ where: { id: user.id }, data: { onboardingStep: null } });
      return;
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { onboardingStep: 4 } });
  }

  private async handleBusinessFilesSkip(user: User) {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    if (!business) throw new ForbiddenException('Business is required');

    await this.uploadSessions.abortDraft(user);
    await this.prisma.user.update({ where: { id: user.id }, data: { onboardingStep: 4 } });
  }

  private async handleBusinessVerificationSkip(tx: Prisma.TransactionClient, user: LoadedUser) {
    if (user.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Only BUSINESS_OWNER can skip verification step');
    }

    const business = await tx.business.findUnique({
      where: { ownerUserId: user.id },
      select: {
        id: true,
        verificationGraceDeadlineAt: true,
        category: { select: { requiresVerification: true, gracePeriodHours: true } },
      },
    });
    if (!business) throw new ConflictException('Business is required');

    const requiresVerification = business.category?.requiresVerification === true;
    const gracePeriodHours = business.category?.gracePeriodHours ?? null;
    const deadline = business.verificationGraceDeadlineAt ?? null;
    const graceExpired = !deadline || deadline.getTime() <= Date.now();

    if (requiresVerification && graceExpired) {
      throw new ConflictException(
        'Cannot skip verification: verification is required and grace period is expired or not provided',
      );
    }

    const shouldActivate = !requiresVerification || gracePeriodHours !== null;

    if (shouldActivate) {
      await tx.business.update({
        where: { id: business.id },
        data: { status: BusinessStatus.ACTIVE },
      });
    }

    await tx.user.update({ where: { id: user.id }, data: { onboardingStep: null } });
  }

  private async handleBusinessVerificationSubmit(
    tx: Prisma.TransactionClient,
    user: LoadedUser,
    payload: any,
  ) {
    if (user.role !== UserRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Only BUSINESS_OWNER can submit verification');
    }

    const dto = await this.validatePayload(BusinessVerificationSubmitPayloadDto, payload);

    const business = await tx.business.findUnique({
      where: { ownerUserId: user.id },
      select: {
        id: true,
        status: true,
        category: { select: { requiresVerification: true, gracePeriodHours: true } },
      },
    });

    if (!business) throw new ConflictException('Business is required before verification submit');

    const requiresVerification = business.category?.requiresVerification === true;
    const gracePeriodHours = business.category?.gracePeriodHours ?? null;

    const file = await tx.file.findUnique({
      where: { id: dto.verificationFileId },
      select: { id: true, businessId: true, type: true },
    });

    if (!file) throw new BadRequestException('Verification file not found');
    if (file.businessId !== business.id) throw new ForbiddenException('Verification file чужой');
    if (file.type !== FileType.BUSINESS_VERIFICATION_DOCUMENT) {
      throw new BadRequestException('File is not a BUSINESS_VERIFICATION_DOCUMENT');
    }

    const locked = await tx.businessVerification.findFirst({
      where: {
        businessId: business.id,
        status: {
          in: [
            BusinessVerificationStatus.PENDING,
            BusinessVerificationStatus.APPROVED,
            BusinessVerificationStatus.RESUBMISSION,
          ]
        },
      },
      select: { id: true, status: true },
    });

    if (locked) {
      throw new ConflictException(
        `Verification is locked (${locked.status}). Cannot submit a new verification.`,
      );
    }

    await tx.businessVerification.create({
      data: {
        businessId: business.id,
        status: BusinessVerificationStatus.PENDING,
        verificationFileId: file.id,
        submittedAt: new Date(),
      },
    });

    const shouldBePending = requiresVerification && gracePeriodHours === null;

    await tx.business.update({
      where: { id: business.id },
      data: { status: shouldBePending ? BusinessStatus.PENDING : BusinessStatus.ACTIVE },
    });

    await tx.user.update({ where: { id: user.id }, data: { onboardingStep: null } });
  }

  // Helpers

  private async loadUser(firebaseUid: string): Promise<LoadedUser> {
    const user = await this.prisma.user.findUnique({
      where: { authExternalId: firebaseUid },
      include: {
        business: {
          select: {
            id: true,
            addressId: true,
            logoId: true,
            status: true,
            verificationGraceDeadlineAt: true,
            category: { select: { id: true, requiresVerification: true } },
          },
        },
      },
    });

    if (!user) throw new BadRequestException('User is not synced. Call /auth/sync first');
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
