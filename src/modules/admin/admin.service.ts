import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, BusinessVerificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { decodeAdminCursor } from './cursor/decode-admin-cursor';
import { encodeAdminCursor } from './cursor/encode-admin-cursor';
import { ActivateBusinessResponseDto } from './dto/activate-business-response.dto';
import { AdminBusinessListItemDto } from './dto/admin-business-list-item.dto';
import { AdminBusinessesResponseDto } from './dto/admin-businesses-response.dto';
import { DeactivateBusinessResponseDto } from './dto/deactivate-business-response.dto';
import { GetAdminBusinessesQueryDto } from './dto/get-admin-businesses-query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinesses(query: GetAdminBusinessesQueryDto): Promise<AdminBusinessesResponseDto> {
    const limit = query.limit ?? 20;

    // Build WHERE clause
    const where: Prisma.BusinessWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && {
        name: {
          contains: query.search,
          mode: 'insensitive',
        },
      }),
      ...(query.city && {
        address: {
          city: query.city,
        },
      }),
    };

    // Decode cursor if provided
    let cursorCondition: Prisma.BusinessWhereInput = {};
    if (query.cursor) {
      const decoded = decodeAdminCursor(query.cursor);
      cursorCondition = {
        OR: [
          {
            createdAt: {
              lt: new Date(decoded.createdAt),
            },
          },
          {
            createdAt: new Date(decoded.createdAt),
            id: {
              lt: decoded.id,
            },
          },
        ],
      };
    }

    // Fetch items (limit + 1 to check hasNextPage)
    const businesses = await this.prisma.business.findMany({
      where: {
        AND: [where, cursorCondition],
      },
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        category: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
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
        logo: {
          select: {
            id: true,
            url: true,
            type: true,
            mimeType: true,
            sizeBytes: true,
            originalName: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    const hasNextPage = businesses.length > limit;
    const items = hasNextPage ? businesses.slice(0, limit) : businesses;

    // Encode next cursor
    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeAdminCursor({
        createdAt: lastItem.createdAt.toISOString(),
        id: lastItem.id,
      });
    }

    // Map to DTO
    const mapped: AdminBusinessListItemDto[] = items.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      category: b.category,
      address: b.address,
      logo: b.logo,
      owner: {
        id: b.owner.id,
        email: b.owner.email,
        username: b.owner.username,
      },
    }));

    return {
      items: mapped,
      meta: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async deactivateBusiness(businessId: string): Promise<DeactivateBusinessResponseDto> {
    // Find business by id
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Update status to SUSPENDED
    await this.prisma.business.update({
      where: { id: businessId },
      data: { status: BusinessStatus.SUSPENDED },
    });

    return {
      businessId,
      status: BusinessStatus.SUSPENDED,
    };
  }

  async activateBusiness(businessId: string): Promise<ActivateBusinessResponseDto> {
    // Load business with all required relations
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        category: {
          select: {
            requiresVerification: true,
          },
        },
        verifications: {
          select: {
            status: true,
          },
        },
        owner: {
          select: {
            onboardingStep: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Precondition: business must be SUSPENDED
    if (business.status !== BusinessStatus.SUSPENDED) {
      throw new BadRequestException('Only suspended businesses can be activated');
    }

    // Calculate new status based on business logic
    let newStatus: BusinessStatus;

    if (business.category.requiresVerification) {
      // Category requires verification
      const hasApproved = business.verifications.some(
        (v) => v.status === BusinessVerificationStatus.APPROVED,
      );
      const hasPending = business.verifications.some(
        (v) => v.status === BusinessVerificationStatus.PENDING,
      );
      const hasRejected = business.verifications.some(
        (v) => v.status === BusinessVerificationStatus.REJECTED,
      );

      if (hasApproved) {
        newStatus = BusinessStatus.ACTIVE;
      } else if (hasPending) {
        newStatus = BusinessStatus.PENDING;
      } else if (hasRejected) {
        newStatus = BusinessStatus.REJECTED;
      } else {
        // No verifications at all
        newStatus = BusinessStatus.PENDING;
      }
    } else {
      // Category does not require verification
      const onboardingCompleted = business.owner.onboardingStep === null;

      if (onboardingCompleted) {
        newStatus = BusinessStatus.ACTIVE;
      } else {
        newStatus = BusinessStatus.PENDING;
      }
    }

    // Update business status
    await this.prisma.business.update({
      where: { id: businessId },
      data: { status: newStatus },
    });

    return {
      businessId,
      status: newStatus,
    };
  }
}
