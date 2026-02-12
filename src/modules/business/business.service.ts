// src/modules/business/business.service.ts
import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Business,
  BusinessStatus,
  BusinessVerificationStatus,
  FileType,
  Prisma,
  User,
} from '@prisma/client';
import convert from 'heic-convert';
import sharp from 'sharp';
import { BusinessHoursService } from 'src/modules/business-hours/business-hours.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';

import { BusinessProfileDto } from './dto/business-profile.dto';
import { BusinessPublicResponseDto } from './dto/business-public-response.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessHoursService: BusinessHoursService,
    private readonly storageService: StorageService,
  ) {}

  async getBusinessOrThrow(user: User): Promise<Business> {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: user.id },
    });

    if (!business) {
      throw new ForbiddenException('Business not found for current user');
    }

    return business;
  }

  async updateLogo(user: User, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Invalid logo file type');
    }

    const business = await this.getBusinessOrThrow(user);

    // Load current logo before anything else
    const businessWithLogo = await this.prisma.business.findUnique({
      where: { id: business.id },
      select: {
        logoId: true,
        logo: { select: { id: true, storageKey: true } },
      },
    });

    if (!businessWithLogo) {
      throw new NotFoundException('Business not found');
    }

    const oldLogoId = businessWithLogo.logo?.id ?? null;
    const oldLogoStorageKey = businessWithLogo.logo?.storageKey ?? null;

    // Prepare buffer for processing
    let processBuffer = file.buffer;

    // Convert HEIC/HEIF to JPEG first (sharp doesn't support them natively)
    if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
      try {
        const jpegBuffer = await convert({
          buffer: file.buffer as unknown as ArrayBufferLike,
          format: 'JPEG',
          quality: 1,
        });
        processBuffer = Buffer.from(jpegBuffer);
      } catch {
        // heic-convert failed, will attempt to process with sharp directly
        void 0;
      }
    }

    // Convert image to WebP for universal browser support
    const webpBuffer = await sharp(processBuffer)
      .webp({ quality: 85 })
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .toBuffer()
      .catch(() => {
        throw new BadRequestException(
          'Unable to process image. Please use JPEG, PNG, WebP, HEIC, or HEIF format.',
        );
      });

    // Upload new logo to S3 as WebP
    const storageKey = `public/business/${business.id}/logo/${randomUUID()}.webp`;

    const uploaded = await this.storageService.uploadPublic({
      storageKey,
      contentType: 'image/webp',
      body: webpBuffer,
    });

    try {
      // Replace logo in DB (transaction)
      const newFile = await this.prisma.$transaction(async (tx) => {
        const createdFile = await tx.file.create({
          data: {
            url: uploaded.publicUrl,
            storageKey: uploaded.storageKey,
            type: FileType.BUSINESS_LOGO,
            mimeType: 'image/webp',
            sizeBytes: webpBuffer.length,
            originalName: file.originalname,
            businessId: null,
          },
        });

        await tx.business.update({
          where: { id: business.id },
          data: { logoId: createdFile.id },
        });

        if (oldLogoId) {
          await tx.file.delete({
            where: { id: oldLogoId },
          });
        }

        return createdFile;
      });

      // delete old logo from S3 (AFTER DB commit)
      if (oldLogoStorageKey) {
        this.storageService.deleteObject(oldLogoStorageKey).catch(() => undefined);
      }

      return {
        id: newFile.id,
        url: uploaded.publicUrl,
      };
    } catch (err) {
      // Rollback uploaded file if DB failed
      await this.storageService.deleteObject(uploaded.storageKey).catch(() => undefined);
      throw err;
    }
  }

  async updateProfile(user: User, dto: UpdateBusinessProfileDto): Promise<BusinessProfileDto> {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const business = await this.getBusinessOrThrow(user);

    const { name, phone, description, serviceOnSite, serviceInStudio, price, businessHours } = dto;

    const updateData: Prisma.BusinessUpdateInput = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (description !== undefined) updateData.description = description;
    if (serviceOnSite !== undefined) updateData.serviceOnSite = serviceOnSite;
    if (serviceInStudio !== undefined) updateData.serviceInStudio = serviceInStudio;
    if (price !== undefined) updateData.price = price;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBusiness = await tx.business.update({
        where: { id: business.id },
        data: updateData,
      });

      if (businessHours) {
        await this.businessHoursService.setBusinessHoursTx(tx, business.id, businessHours);
      }

      return updatedBusiness;
    });

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      price: updated.price,
      description: updated.description,
      serviceOnSite: updated.serviceOnSite,
      serviceInStudio: updated.serviceInStudio,
    };
  }

  async getActiveBusinessById(businessId: string): Promise<BusinessPublicResponseDto> {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        status: BusinessStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        email: true,
        price: true,
        serviceOnSite: true,
        serviceInStudio: true,
        ratingAvg: true,
        ratingCount: true,
        timeZone: true,
        status: true,
        createdAt: true,

        address: {
          select: {
            countryCode: true,
            city: true,
            state: true,
            addressLine1: true,
            addressLine2: true,
            zip: true,
          },
        },

        category: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },

        logo: {
          select: {
            id: true,
            url: true,
            type: true,
          },
        },

        businessHours: {
          orderBy: { weekday: 'asc' },
          select: {
            weekday: true,
            startTime: true,
            endTime: true,
            isClosed: true,
            is24h: true,
          },
        },

        files: {
          where: {
            type: FileType.BUSINESS_PHOTO,
          },
          select: {
            id: true,
            url: true,
            type: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found or not active');
    }

    return {
      id: business.id,
      name: business.name,
      description: business.description,
      phone: business.phone,
      email: business.email,
      price: business.price,
      serviceOnSite: business.serviceOnSite,
      serviceInStudio: business.serviceInStudio,
      ratingAvg: business.ratingAvg,
      ratingCount: business.ratingCount,
      timeZone: business.timeZone,
      status: business.status,
      createdAt: business.createdAt,

      address: business.address
        ? {
            countryCode: business.address.countryCode,
            city: business.address.city,
            state: business.address.state,
            addressLine1: business.address.addressLine1,
            addressLine2: business.address.addressLine2,
            zip: business.address.zip,
          }
        : null,

      category: {
        id: business.category.id,
        title: business.category.title,
        slug: business.category.slug,
      },

      logo: business.logo
        ? {
            id: business.logo.id,
            url: business.logo.url,
            type: business.logo.type,
          }
        : null,

      businessHours: business.businessHours.map((h) => ({
        weekday: h.weekday,
        startTime: h.startTime ? h.startTime.toISOString() : null,
        endTime: h.endTime ? h.endTime.toISOString() : null,
        isClosed: h.isClosed,
        is24h: h.is24h,
      })),

      photos: business.files.map((file) => ({
        id: file.id,
        url: file.url,
        type: file.type,
      })),
    };
  }

  async submitVerification(user: User, verificationFileId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get business for current user
      const business = await tx.business.findUnique({
        where: { ownerUserId: user.id },
        select: { id: true },
      });

      if (!business) {
        throw new ForbiddenException('Business not found for current user');
      }

      // 2. Check that there's no active verification (PENDING, APPROVED)
      const locked = await tx.businessVerification.findFirst({
        where: {
          businessId: business.id,
          status: {
            in: [BusinessVerificationStatus.PENDING, BusinessVerificationStatus.APPROVED],
          },
        },
        select: { id: true, status: true },
      });

      if (locked) {
        throw new ConflictException(
          `Verification is locked (${locked.status}). Cannot submit a new verification.`,
        );
      }

      // 3. Check if any verification exists
      const anyVerification = await tx.businessVerification.findFirst({
        where: { businessId: business.id },
        select: { id: true, status: true },
        orderBy: { createdAt: 'desc' },
      });

      // Allow submission if:
      // - No verifications exist (first-time verification for optional categories or grace period)
      // - Previous verification is RESUBMISSION or REJECTED
      const canSubmit =
        !anyVerification ||
        anyVerification.status === BusinessVerificationStatus.RESUBMISSION ||
        anyVerification.status === BusinessVerificationStatus.REJECTED;

      if (!canSubmit) {
        throw new ConflictException(
          `Cannot submit verification. Previous verification status: ${anyVerification?.status}. Only RESUBMISSION or REJECTED statuses allow new submissions.`,
        );
      }

      // 4. Validate the new verification file
      const file = await tx.file.findUnique({
        where: { id: verificationFileId },
        select: { id: true, businessId: true, type: true },
      });

      if (!file) {
        throw new BadRequestException('Verification file not found');
      }

      if (file.businessId !== business.id) {
        throw new ForbiddenException('Verification file does not belong to your business');
      }

      if (file.type !== FileType.BUSINESS_VERIFICATION_DOCUMENT) {
        throw new BadRequestException('File is not a BUSINESS_VERIFICATION_DOCUMENT');
      }

      // 5. Create NEW verification record with PENDING status
      const newVerification = await tx.businessVerification.create({
        data: {
          businessId: business.id,
          status: BusinessVerificationStatus.PENDING,
          verificationFileId: file.id,
          submittedAt: new Date(),
        },
      });

      return {
        verificationId: newVerification.id,
        status: BusinessVerificationStatus.PENDING,
        message: 'Verification has been submitted successfully',
      };
    });
  }
}
