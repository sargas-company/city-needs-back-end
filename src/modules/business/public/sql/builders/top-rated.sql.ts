import { Prisma } from '@prisma/client';

import { SqlBuilderResult } from './types';
import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';
import { buildAvailabilitySql } from '../fragments/availability.sql';
import { buildBaseBusinessFiltersSql } from '../fragments/base-business-filters.sql';
import { buildDistanceSql } from '../fragments/distance.sql';
import { buildIsSavedSql } from '../fragments/is-saved.sql';
import { buildOpenNowSql } from '../fragments/open-now.sql';
import { buildBusinessPriceFilterSql } from '../fragments/business-price-filter.sql';
import { buildServiceSearchSql } from '../fragments/service-search.sql';

/**
 * TOP_RATED sorting
 *
 * Order:
 *  - ratingAvg DESC
 *  - ratingCount DESC
 *  - id DESC
 *
 * Cursor:
 *  (ratingAvg, ratingCount, id)
 *
 * distance is returned ONLY when withinKm is used
 */
export function buildTopRatedBusinessesSql(
  query: NormalizedBusinessesQuery,
  decodedCursor: {
    values: {
      ratingAvg: number;
      ratingCount: number;
      id: string;
    };
  } | null,
): SqlBuilderResult<{
  id: string;
  ratingAvg: number;
  ratingCount: number;
  distance?: number;
}> {
  const { limit, openNow, lat, lng, radiusMeters, userId } = query;

  const needsDistance = radiusMeters !== undefined;
  const distanceSql =
    needsDistance && lat !== undefined && lng !== undefined ? buildDistanceSql(lat, lng) : null;

  const { leftJoin: isSavedJoin, selectExpr: isSavedExpr } = buildIsSavedSql(userId, 'b');

  /**
   * Cursor condition (applied on outer query)
   */
  const cursorCondition = decodedCursor
    ? Prisma.sql`
        WHERE
          sub."ratingAvg" < ${decodedCursor.values.ratingAvg}
          OR (
            sub."ratingAvg" = ${decodedCursor.values.ratingAvg}
            AND sub."ratingCount" < ${decodedCursor.values.ratingCount}
          )
          OR (
            sub."ratingAvg" = ${decodedCursor.values.ratingAvg}
            AND sub."ratingCount" = ${decodedCursor.values.ratingCount}
            AND sub.id < ${decodedCursor.values.id}
          )
      `
    : Prisma.empty;

  /**
   * IMPORTANT:
   * - ratings come from inner query
   * - distance is calculated ONLY in outer query
   */
  const sql = Prisma.sql`
    SELECT
      sub.id,
      sub."ratingAvg",
      sub."ratingCount"
      ${distanceSql ? Prisma.sql`, ${distanceSql} AS distance` : Prisma.empty},
      sub."isSaved"
    FROM (
      SELECT
        b.id,
        b."ratingAvg",
        b."ratingCount",
        ${isSavedExpr} AS "isSaved"
      FROM businesses b
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
    ) sub
    ${distanceSql ? Prisma.sql`JOIN locations l ON l."businessId" = sub.id` : Prisma.empty}
    ${cursorCondition}
    ${
      distanceSql && radiusMeters ? Prisma.sql`AND ${distanceSql} <= ${radiusMeters}` : Prisma.empty
    }

    ORDER BY
      sub."ratingAvg" DESC,
      sub."ratingCount" DESC,
      sub.id DESC

    LIMIT ${limit + 1}
  `;

  return {
    sql,
    extractCursorValues: (row) => ({
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      id: row.id,
    }),
  };
}
