import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { decodeAdminCursor } from './cursor/decode-admin-cursor';
import { encodeAdminCursor } from './cursor/encode-admin-cursor';
import { AdminBusinessListItemDto } from './dto/admin-business-list-item.dto';
import { AdminBusinessesResponseDto } from './dto/admin-businesses-response.dto';
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
}
