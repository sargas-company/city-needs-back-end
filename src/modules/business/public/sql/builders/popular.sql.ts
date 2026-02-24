import { Prisma } from '@prisma/client';

import { SqlBuilderResult } from './types';
import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';
import { buildAvailabilitySql } from '../fragments/availability.sql';
import { buildBaseBusinessFiltersSql } from '../fragments/base-business-filters.sql';
import { buildBusinessPriceFilterSql } from '../fragments/business-price-filter.sql';
import { buildDistanceSql } from '../fragments/distance.sql';
import { buildIsSavedSql } from '../fragments/is-saved.sql';
import { buildOpenNowSql } from '../fragments/open-now.sql';
import { buildServiceSearchSql } from '../fragments/service-search.sql';

/**
 * POPULAR sorting
 *
 * popularity = COUNT(bookings) in last 30 days
 * deterministic cursor: (popularity, id)
 */
export function buildPopularBusinessesSql(
  query: NormalizedBusinessesQuery,
  decodedCursor: {
    values: {
      popularity: number;
      id: string;
    };
  } | null,
): SqlBuilderResult<{
  id: string;
  popularity: number;
}> {
  const { limit, openNow, lat, lng, radiusMeters, userId } = query;
  const needsDistance = radiusMeters !== undefined;

  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const distanceSql =
    needsDistance && lat !== undefined && lng !== undefined ? buildDistanceSql(lat, lng) : null;

  const { leftJoin: isSavedJoin, selectExpr: isSavedExpr } = buildIsSavedSql(userId, 'b');

  const cursorCondition = decodedCursor
    ? Prisma.sql`
      HAVING
        COUNT(sub.booking_id) < ${decodedCursor.values.popularity}
        OR (
          COUNT(sub.booking_id) = ${decodedCursor.values.popularity}
          AND sub.id < ${decodedCursor.values.id}
        )
    `
    : Prisma.empty;

  const sql = Prisma.sql`
    SELECT
      sub.id,
      COUNT(sub.booking_id)::int AS popularity
      ${needsDistance ? Prisma.sql`, sub.distance` : Prisma.empty},
      sub."isSaved"
    FROM (
      SELECT
        b.id,
        book.id AS booking_id
        ${needsDistance ? Prisma.sql`, ${distanceSql} AS distance` : Prisma.empty},
        ${isSavedExpr} AS "isSaved"
      FROM businesses b
      LEFT JOIN bookings book
        ON book."businessId" = b.id
        AND book.status IN ('CONFIRMED', 'COMPLETED')
        AND book."createdAt" >= ${fromDate}
      ${needsDistance ? Prisma.sql`JOIN locations l ON l."businessId" = b.id` : Prisma.empty}
      ${isSavedJoin}

      WHERE b.status = 'ACTIVE'
        ${buildBaseBusinessFiltersSql(query)}
        ${openNow ? buildOpenNowSql('b') : Prisma.empty}
        ${
          query.availabilityDate
            ? buildAvailabilitySql(query, 'b')
            : buildServiceSearchSql(query, 'b')
        }
        ${buildBusinessPriceFilterSql(query)}
        ${needsDistance ? Prisma.sql`AND ${distanceSql} <= ${radiusMeters}` : Prisma.empty}
    ) sub

    GROUP BY sub.id ${needsDistance ? Prisma.sql`, sub.distance` : Prisma.empty}, sub."isSaved"
    ${cursorCondition}

    ORDER BY popularity DESC, sub.id DESC
    LIMIT ${limit + 1}
  `;

  return {
    sql,
    extractCursorValues: (row) => ({
      popularity: row.popularity,
      id: row.id,
    }),
  };
}
