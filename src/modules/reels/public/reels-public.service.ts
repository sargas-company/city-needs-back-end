// src/modules/reels/public/reels-public.service.ts

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { GetReelsQueryDto } from './dto/get-reels-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';

type ReelCursor = {
  createdAt: string;
  id: string;
};

@Injectable()
export class ReelsPublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getReels(query: GetReelsQueryDto) {
    const limit = query.limit ?? 10;
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

    const where: Prisma.ReelWhereInput = {
      business: {
        status: 'ACTIVE',
        ...(query.categoryId && { categoryId: query.categoryId }),
        ...(query.search && {
          name: { contains: query.search, mode: 'insensitive' },
        }),
      },
      ...(cursor && {
        OR: [
          {
            createdAt: { lt: new Date(cursor.createdAt) },
          },
          {
            createdAt: new Date(cursor.createdAt),
            id: { lt: cursor.id },
          },
        ],
      }),
    };

    const reels = await this.prisma.reel.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        video: {
          select: {
            url: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            ratingAvg: true,
            ratingCount: true,
            logo: {
              select: {
                url: true,
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
          },
        },
      },
    });

    const hasNextPage = reels.length > limit;
    const items = hasNextPage ? reels.slice(0, limit) : reels;

    const nextCursor = hasNextPage
      ? this.encodeCursor({
          id: items[items.length - 1].id,
          createdAt: items[items.length - 1].createdAt.toISOString(),
        })
      : null;

    return {
      items: items.map((r) => ({
        id: r.id,
        videoUrl: r.video.url,
        createdAt: r.createdAt,
        business: {
          id: r.business.id,
          name: r.business.name,
          categoryId: r.business.categoryId,
          ratingAvg: r.business.ratingAvg,
          ratingCount: r.business.ratingCount,
          logoUrl: r.business.logo?.url ?? null,
          address: r.business.address,
        },
      })),
      nextCursor,
      hasNextPage,
    };
  }

  // --------------------------------------------------
  // Cursor helpers
  // --------------------------------------------------

  private encodeCursor(cursor: ReelCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(cursor: string): ReelCursor {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  }
}
