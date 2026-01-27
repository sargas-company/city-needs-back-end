import { Prisma } from '@prisma/client';

import { SqlBuilderResult } from './types';
import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';
import { buildAvailabilitySql } from '../fragments/availability.sql';
import { buildBaseBusinessFiltersSql } from '../fragments/base-business-filters.sql';
import { buildDistanceSql } from '../fragments/distance.sql';
import { buildOpenNowSql } from '../fragments/open-now.sql';
import { buildServiceSearchSql } from '../fragments/service-search.sql';

/**
 * NEARBY sorting
 *
 * Distance-based ordering (meters)
 * Deterministic cursor: (distance, id)
 *
 * Order:
 *  - distance ASC
 *  - id DESC
 */
export function buildNearbyBusinessesSql(
  query: NormalizedBusinessesQuery,
  decodedCursor: {
    values: {
      distance: number;
      id: string;
    };
  } | null,
): SqlBuilderResult<{
  id: string;
  distance: number;
}> {
  const { lat, lng, limit, openNow, radiusMeters } = query;

  // lat/lng presence already validated
  const latitude = lat!;
  const longitude = lng!;

  const distanceSql = buildDistanceSql(latitude, longitude);

  /**
   * Optional radius filter (withinKm)
   */
  const radiusCondition = radiusMeters
    ? Prisma.sql`AND ${distanceSql} <= ${radiusMeters}`
    : Prisma.empty;

  /**
   * Cursor condition must be applied
   * to already computed distance
   */
  const cursorCondition = decodedCursor
    ? Prisma.sql`
        WHERE
          sub.distance > ${decodedCursor.values.distance}
          OR (
            sub.distance = ${decodedCursor.values.distance}
            AND sub.id < ${decodedCursor.values.id}
          )
      `
    : Prisma.empty;

  const sql = Prisma.sql`
    SELECT
      sub.id,
      sub.distance
    FROM (
      SELECT
        b.id,
        ${distanceSql} AS distance
      FROM businesses b
      JOIN locations l ON l."businessId" = b.id
      WHERE b.status = 'ACTIVE'
        ${buildBaseBusinessFiltersSql(query)}
        ${openNow ? buildOpenNowSql('b') : Prisma.empty}
        ${
          query.availabilityDate
            ? buildAvailabilitySql(query, 'b')
            : buildServiceSearchSql(query, 'b')
        }
        ${radiusCondition}
    ) sub
    ${cursorCondition}
    ORDER BY
      sub.distance ASC,
      sub.id DESC
    LIMIT ${limit + 1}
  `;

  return {
    sql,
    extractCursorValues: (row) => ({
      distance: row.distance,
      id: row.id,
    }),
  };
}
