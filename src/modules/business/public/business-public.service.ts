import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { BusinessCardDto } from './dto/business-card.dto';
import { GetBusinessesQueryDto } from './dto/get-businesses-query.dto';
import { GetBusinessesResponseDto } from './dto/get-businesses-response.dto';
import { mapBusinessCard } from './mappers/map-business-card';
import { normalizeBusinessesQuery } from './query/normalize-businesses-query';
import { validateBusinessesQuery } from './query/validate-businesses-query';
import { buildBusinessesCountSql } from './sql/count/count-businesses.sql';
import { executeBusinessesQuery } from './sql/execute-businesses-query';

@Injectable()
export class BusinessPublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinesses(rawQuery: GetBusinessesQueryDto): Promise<GetBusinessesResponseDto> {
    // ---------------------------------------
    // 1. Normalize + validate
    // ---------------------------------------
    const query = normalizeBusinessesQuery(rawQuery);
    validateBusinessesQuery(query);

    // ---------------------------------------
    // 2. totalCount
    // ---------------------------------------
    const countSql = buildBusinessesCountSql(query);
    const [{ total }] = await this.prisma.$queryRaw<{ total: number }[]>(countSql);

    // ---------------------------------------
    // 3. Execute SQL (list query)
    // ---------------------------------------
    const { rows, nextCursor, hasNextPage } = await executeBusinessesQuery(this.prisma, query);

    // ---------------------------------------
    // 4. Empty result
    // ---------------------------------------
    if (rows.length === 0) {
      return {
        data: [],
        meta: {
          nextCursor: null,
          hasNextPage: false,
          totalCount: total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }

    // ---------------------------------------
    // 5. Load business entities
    // ---------------------------------------
    const ids = rows.map((r) => r.id);

    const businesses = await this.prisma.business.findMany({
      where: { id: { in: ids } },
      include: {
        logo: { select: { url: true } },
        category: { select: { id: true, title: true, slug: true } },
        address: { select: { city: true } },
      },
    });

    const businessMap = new Map(businesses.map((b) => [b.id, b]));

    // ---------------------------------------
    // 6. Map DTO
    // ---------------------------------------
    const data: BusinessCardDto[] = rows
      .map((row) => {
        const business = businessMap.get(row.id);
        if (!business) return null;

        return mapBusinessCard(business, {
          distance: row.distance,
        });
      })
      .filter((item): item is BusinessCardDto => item !== null);

    // ---------------------------------------
    // 7. Final response
    // ---------------------------------------
    return {
      data,
      meta: {
        nextCursor,
        hasNextPage,
        totalCount: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
