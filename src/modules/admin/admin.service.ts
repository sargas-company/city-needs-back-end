import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, BusinessVerificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { decodeAdminCursor } from './cursor/decode-admin-cursor';
import { encodeAdminCursor } from './cursor/encode-admin-cursor';
import { ActivateBusinessResponseDto } from './dto/activate-business-response.dto';
import { AdminBusinessListItemDto } from './dto/admin-business-list-item.dto';
import { AdminBusinessesResponseDto } from './dto/admin-businesses-response.dto';
import { AdminStatisticsSummaryDto } from './dto/admin-statistics-summary.dto';
import { AdminVerificationDetailDto } from './dto/admin-verification-detail.dto';
import { AdminVerificationsResponseDto } from './dto/admin-verifications-response.dto';
import { DeactivateBusinessResponseDto } from './dto/deactivate-business-response.dto';
import { GetAdminBusinessesQueryDto } from './dto/get-admin-businesses-query.dto';
import { GetAdminVerificationsQueryDto } from './dto/get-admin-verifications-query.dto';

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

  async getStatisticsSummary(): Promise<AdminStatisticsSummaryDto> {
    const result = await this.prisma.$queryRaw<Array<{ result: AdminStatisticsSummaryDto }>>`
      WITH
        businesses_by_category AS (
          SELECT
            c.id as "categoryId",
            c.title,
            COUNT(b.id) as count
          FROM categories c
          LEFT JOIN businesses b
            ON b."categoryId" = c.id
            AND b.status IN ('ACTIVE', 'PENDING')
          GROUP BY c.id, c.title
        ),

        totals AS (
          SELECT
            (SELECT COUNT(*)
             FROM users
             WHERE status != 'DELETED') as users,

            (SELECT COUNT(*)
             FROM businesses
             WHERE status IN ('ACTIVE', 'PENDING')) as businesses,

            (SELECT COUNT(*)
             FROM users
             WHERE "createdAt" >= NOW() - INTERVAL '30 days'
             AND status != 'DELETED') as "newUsers",

            (SELECT COUNT(*)
             FROM reels) as reels
        )

      SELECT json_build_object(
        'businessesByCategory', (
          SELECT COALESCE(
            json_agg(
              row_to_json(businesses_by_category)
              ORDER BY count DESC, title ASC
            ),
            '[]'::json
          )
          FROM businesses_by_category
        ),
        'totals', (
          SELECT row_to_json(totals)
          FROM totals
        )
      ) as result
    `;

    return result[0].result;
  }

  async getVerifications(
    query: GetAdminVerificationsQueryDto,
  ): Promise<AdminVerificationsResponseDto> {
    const limit = query.limit ?? 20;

    // 1. where
    const where: Prisma.BusinessVerificationWhereInput = {
      ...(query.status && { status: query.status }),

      ...(query.search && {
        business: {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      }),

      ...(query.city && {
        business: {
          address: {
            city: query.city,
          },
        },
      }),

      ...(query.categoryId && {
        business: {
          categoryId: query.categoryId,
        },
      }),
    };

    // 2. cursor
    let cursorCondition: Prisma.BusinessVerificationWhereInput = {};
    if (query.cursor) {
      const decoded = decodeAdminCursor(query.cursor);

      cursorCondition = {
        OR: [
          { createdAt: { lt: new Date(decoded.createdAt) } },
          {
            createdAt: new Date(decoded.createdAt),
            id: { lt: decoded.id },
          },
        ],
      };
    }

    // 3. query
    const verifications = await this.prisma.businessVerification.findMany({
      where: {
        AND: [where, cursorCondition],
      },
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        verificationFile: {
          select: {
            id: true,
            url: true,
            mimeType: true,
            originalName: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            logo: {
              select: {
                id: true,
                url: true,
                type: true,
              },
            },
            owner: {
              select: {
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // 4. pagination
    const hasNextPage = verifications.length > limit;
    const items = hasNextPage ? verifications.slice(0, limit) : verifications;

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeAdminCursor({
        createdAt: last.createdAt.toISOString(),
        id: last.id,
      });
    }

    // 5. map to DTO
    const mapped = items.map((v) => this.mapVerificationToDto(v));

    return {
      items: mapped,
      meta: {
        hasNextPage,
        nextCursor,
      },
    };
  }

  async getVerification(id: string): Promise<AdminVerificationDetailDto> {
    const verification = await this.prisma.businessVerification.findUnique({
      where: { id },
      include: {
        verificationFile: {
          select: {
            id: true,
            url: true,
            mimeType: true,
            originalName: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            logo: {
              select: {
                id: true,
                url: true,
                type: true,
              },
            },
            owner: {
              select: {
                email: true,
                username: true,
              },
            },
            category: {
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                requiresVerification: true,
                gracePeriodHours: true,
              },
            },
            address: {
              select: {
                id: true,
                countryCode: true,
                city: true,
                state: true,
                addressLine1: true,
                addressLine2: true,
                zip: true,
              },
            },
            files: {
              select: {
                id: true,
                url: true,
                type: true,
                mimeType: true,
                sizeBytes: true,
                originalName: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    return this.mapVerificationToDto(verification, true);
  }

  private mapVerificationToDto(
    v: {
      id: string;
      status: BusinessVerificationStatus;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      rejectionReason: string | null;
      createdAt: Date;
      verificationFile: {
        id: string;
        url: string;
        mimeType: string | null;
        originalName: string | null;
      } | null;
      business: {
        id: string;
        name: string;
        logo: {
          id: string;
          url: string;
          type: any;
        } | null;
        owner: {
          email: string | null;
          username: string | null;
        };
        category?: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          requiresVerification: boolean;
          gracePeriodHours: number | null;
        };
        address?: {
          id: string;
          countryCode: string;
          city: string;
          state: string;
          addressLine1: string;
          addressLine2: string | null;
          zip: string | null;
        } | null;
        files?: Array<{
          id: string;
          url: string;
          type: any;
          mimeType: string | null;
          sizeBytes: number | null;
          originalName: string | null;
          createdAt: Date;
        }>;
      };
    },
    includeExtended = false,
  ): any {
    const baseData = {
      id: v.id,
      status: v.status,
      submittedAt: v.submittedAt?.toISOString() ?? null,
      reviewedAt: v.reviewedAt?.toISOString() ?? null,
      rejectionReason: v.rejectionReason,
      createdAt: v.createdAt.toISOString(),
      verificationFile: v.verificationFile
        ? {
            id: v.verificationFile.id,
            url: v.verificationFile.url,
            mimeType: v.verificationFile.mimeType,
            originalName: v.verificationFile.originalName,
          }
        : null,
    };

    if (includeExtended && v.business.category) {
      return {
        ...baseData,
        business: {
          id: v.business.id,
          name: v.business.name,
          logo: v.business.logo
            ? {
                id: v.business.logo.id,
                url: v.business.logo.url,
                type: v.business.logo.type,
              }
            : null,
          owner: {
            email: v.business.owner.email,
            username: v.business.owner.username,
          },
          category: {
            id: v.business.category.id,
            title: v.business.category.title,
            slug: v.business.category.slug,
            description: v.business.category.description,
            requiresVerification: v.business.category.requiresVerification,
            gracePeriodHours: v.business.category.gracePeriodHours,
          },
          address: v.business.address
            ? {
                id: v.business.address.id,
                countryCode: v.business.address.countryCode,
                city: v.business.address.city,
                state: v.business.address.state,
                addressLine1: v.business.address.addressLine1,
                addressLine2: v.business.address.addressLine2,
                zip: v.business.address.zip,
              }
            : null,
          files: (v.business.files || []).map((file) => ({
            id: file.id,
            url: file.url,
            type: file.type,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            originalName: file.originalName,
            createdAt: file.createdAt.toISOString(),
          })),
        },
      };
    }

    return {
      ...baseData,
      business: {
        id: v.business.id,
        name: v.business.name,
        logo: v.business.logo
          ? {
              id: v.business.logo.id,
              url: v.business.logo.url,
              type: v.business.logo.type,
            }
          : null,
        owner: {
          email: v.business.owner.email,
          username: v.business.owner.username,
        },
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

  async approveVerification(verificationId: string, adminUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.businessVerification.findUnique({
        where: { id: verificationId },
        include: {
          business: true,
        },
      });

      if (!verification) {
        throw new NotFoundException('Verification not found');
      }

      if (verification.status !== BusinessVerificationStatus.PENDING) {
        throw new BadRequestException('Only PENDING verification can be approved');
      }

      // 1. update verification
      await tx.businessVerification.update({
        where: { id: verificationId },
        data: {
          status: BusinessVerificationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedByAdminId: adminUserId ?? null,
          rejectionReason: null,
        },
      });

      // 2. calculate business status
      let finalBusinessStatus = verification.business.status;

      if (
        finalBusinessStatus === BusinessStatus.PENDING ||
        finalBusinessStatus === BusinessStatus.REJECTED
      ) {
        finalBusinessStatus = BusinessStatus.ACTIVE;

        await tx.business.update({
          where: { id: verification.businessId },
          data: { status: finalBusinessStatus },
        });
      }

      // 3. response
      return {
        verificationId: verification.id,
        verificationStatus: BusinessVerificationStatus.APPROVED,
        businessId: verification.businessId,
        businessStatus: finalBusinessStatus,
      };
    });
  }

  async rejectVerification(verificationId: string, rejectionReason: string, adminUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.businessVerification.findUnique({
        where: { id: verificationId },
        include: {
          business: {
            include: {
              category: true,
            },
          },
        },
      });

      if (!verification) {
        throw new NotFoundException('Verification not found');
      }

      if (verification.status !== BusinessVerificationStatus.PENDING) {
        throw new BadRequestException('Only PENDING verification can be rejected');
      }

      // 1. update verification
      await tx.businessVerification.update({
        where: { id: verificationId },
        data: {
          status: BusinessVerificationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedByAdminId: adminUserId ?? null,
          rejectionReason,
        },
      });

      const business = verification.business;
      const category = business.category;
      const now = new Date();

      let finalBusinessStatus = business.status;

      // 2. business status logic
      if (category.requiresVerification) {
        const hasGracePeriod =
          typeof category.gracePeriodHours === 'number' && category.gracePeriodHours > 0;

        if (!hasGracePeriod) {
          // mandatory verification without grace
          if (business.status !== BusinessStatus.SUSPENDED) {
            finalBusinessStatus = BusinessStatus.REJECTED;

            await tx.business.update({
              where: { id: business.id },
              data: { status: finalBusinessStatus },
            });
          }
        } else {
          // mandatory verification with grace
          const deadline = business.verificationGraceDeadlineAt;

          if (deadline && deadline < now) {
            if (business.status !== BusinessStatus.SUSPENDED) {
              finalBusinessStatus = BusinessStatus.REJECTED;

              await tx.business.update({
                where: { id: business.id },
                data: { status: finalBusinessStatus },
              });
            }
          }
          // grace active → do nothing
        }
      }
      // category does not require verification → do nothing

      // 3. response
      return {
        verificationId: verification.id,
        verificationStatus: BusinessVerificationStatus.REJECTED,
        businessId: business.id,
        businessStatus: finalBusinessStatus,
      };
    });
  }
}
