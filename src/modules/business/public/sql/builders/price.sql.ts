import { Prisma } from '@prisma/client';

import { SqlBuilderResult } from './types';
import { BusinessSort } from '../../dto/business-sort.enum';
import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';
import { buildAvailabilitySql } from '../fragments/availability.sql';
import { buildBaseBusinessFiltersSql } from '../fragments/base-business-filters.sql';
import { buildDistanceSql } from '../fragments/distance.sql';
import { buildOpenNowSql } from '../fragments/open-now.sql';
import { buildServiceSearchSql } from '../fragments/service-search.sql';

/**
 * PRICE_ASC / PRICE_DESC sorting
 *
 * price = MIN(service.price) | MAX(service.price)
 * deterministic cursor: (price, id)
 *
 * distance is returned ONLY when withinKm is used
 */
export function buildPriceBusinessesSql(
  query: NormalizedBusinessesQuery,
  decodedCursor: {
    values: {
      price: number;
      id: string;
    };
  } | null,
): SqlBuilderResult<{
  id: string;
  price: number;
  distance?: number;
}> {
  const { limit, openNow, sort, lat, lng, radiusMeters } = query;

  const isAsc = sort === BusinessSort.PRICE_ASC;
  const priceSelect = isAsc ? Prisma.sql`MIN(s.price)` : Prisma.sql`MAX(s.price)`;

  const needsDistance = radiusMeters !== undefined;
  const distanceSql =
    needsDistance && lat !== undefined && lng !== undefined ? buildDistanceSql(lat, lng) : null;

  /**
   * Cursor condition (applied on aggregated result)
   */
  const cursorCondition = decodedCursor
    ? Prisma.sql`
        WHERE
          sub.price ${isAsc ? Prisma.sql`>` : Prisma.sql`<`} ${decodedCursor.values.price}
          OR (
            sub.price = ${decodedCursor.values.price}
            AND sub.id < ${decodedCursor.values.id}
          )
      `
    : Prisma.empty;

  /**
   * IMPORTANT:
   * - aggregation happens in inner query
   * - distance is calculated ONLY in outer query
   */
  const sql = Prisma.sql`
    SELECT
      sub.id,
      sub.price
      ${distanceSql ? Prisma.sql`, ${distanceSql} AS distance` : Prisma.empty}
    FROM (
      SELECT
        b.id,
        ${priceSelect}::int AS price
      FROM businesses b
      JOIN business_services s
        ON s."businessId" = b.id
        AND s.status = 'ACTIVE'

      WHERE b.status = 'ACTIVE'
        ${buildBaseBusinessFiltersSql(query)}
        ${openNow ? buildOpenNowSql('b') : Prisma.empty}
        ${buildServiceSearchSql(query, 'b')}
        ${buildAvailabilitySql(query, 'b')}

      GROUP BY b.id
    ) sub
    ${distanceSql ? Prisma.sql`JOIN locations l ON l."businessId" = sub.id` : Prisma.empty}
    ${cursorCondition}
    ${
      distanceSql && radiusMeters ? Prisma.sql`AND ${distanceSql} <= ${radiusMeters}` : Prisma.empty
    }

    ORDER BY
      sub.price ${isAsc ? Prisma.sql`ASC` : Prisma.sql`DESC`},
      sub.id DESC

    LIMIT ${limit + 1}
  `;

  return {
    sql,
    extractCursorValues: (row) => ({
      price: row.price,
      id: row.id,
    }),
  };
}
