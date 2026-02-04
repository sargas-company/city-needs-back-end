import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CursorPaginationMetaDto,
  CursorPaginationQueryDto,
  CursorPaginationResponseDto,
} from 'src/common/dto/cursor-pagination.dto';
import { PrismaService } from 'src/prisma/prisma.service';

import { SavedBusinessCardDto } from './dto/business-card.dto';

@Injectable()
export class SavedBusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        ownerUserId: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.ownerUserId === userId) {
      throw new ForbiddenException('Cannot add your own business to favorites');
    }

    const existing = await this.prisma.savedBusiness.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
    });

    if (existing) {
      return;
    }

    await this.prisma.savedBusiness.create({
      data: {
        userId,
        businessId,
      },
    });
  }

  async remove(userId: string, businessId: string): Promise<void> {
    await this.prisma.savedBusiness.deleteMany({
      where: {
        userId,
        businessId,
      },
    });
  }

  async list(
    userId: string,
    query: CursorPaginationQueryDto,
  ): Promise<CursorPaginationResponseDto<SavedBusinessCardDto>> {
    const limit = query.limit ? Math.min(query.limit, 50) : 10;

    const cursorCondition = query.cursor ? { id: { lt: query.cursor } } : undefined;

    const items = await this.prisma.savedBusiness.findMany({
      where: {
        userId,
        ...(cursorCondition ? cursorCondition : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      include: {
        business: {
          include: {
            address: {
              select: { city: true },
            },
            logo: {
              select: { url: true },
            },
          },
        },
      },
    });

    const hasNextPage = items.length > limit;
    const sliced = hasNextPage ? items.slice(0, limit) : items;

    const data: SavedBusinessCardDto[] = sliced.map((item) => ({
      id: item.business.id,
      name: item.business.name,
      city: item.business.address?.city ?? '',
      logoUrl: item.business.logo?.url ?? null,
    }));

    const nextCursor = hasNextPage ? sliced[sliced.length - 1].id : null;

    const totalCount = await this.prisma.savedBusiness.count({
      where: { userId },
    });

    const totalPages = Math.ceil(totalCount / limit);

    const meta: CursorPaginationMetaDto = {
      nextCursor,
      totalCount,
      totalPages,
      hasNextPage,
    };

    return {
      data,
      meta,
    };
  }
}
