// src/modules/business/business.service.ts
import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Business, BusinessStatus, FileType, Prisma, User } from '@prisma/client';
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

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}`);
    }

    const business = await this.getBusinessOrThrow(user);

    const ext = this.guessExt(file.mimetype, file.originalname);
    const storageKey = `public/business/${business.id}/logo/${randomUUID()}${ext ? `.${ext}` : ''}`;

    const uploaded = await this.storageService.uploadPublic({
      storageKey,
      contentType: file.mimetype,
      body: file.buffer,
    });

    let oldStorageKey: string | null = null;
    let result: { id: string; url: string };

    try {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.business.findUnique({
          where: { id: business.id },
          select: {
            logoId: true,
            logo: { select: { storageKey: true } },
          },
        });

        if (current?.logoId) {
          oldStorageKey = current.logo?.storageKey ?? null;
          await tx.file.delete({ where: { id: current.logoId } });
        }

        const newFile = await tx.file.create({
          data: {
            url: uploaded.publicUrl,
            storageKey: uploaded.storageKey,
            type: FileType.BUSINESS_LOGO,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            originalName: file.originalname,
            businessId: null,
          },
        });

        await tx.business.update({
          where: { id: business.id },
          data: { logoId: newFile.id },
        });

        result = {
          id: newFile.id,
          url: uploaded.publicUrl,
        };
      });
    } catch (err) {
      await this.storageService.deleteObject(uploaded.storageKey).catch(() => undefined);
      throw err;
    }

    if (oldStorageKey) {
      this.storageService.deleteObject(oldStorageKey).catch(() => undefined);
    }

    return result!;
  }

  private guessExt(mime: string, originalName: string): string | null {
    const lower = originalName.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
    if (lower.endsWith('.png')) return 'png';
    if (lower.endsWith('.webp')) return 'webp';

    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';

    return null;
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
    };
  }
}
