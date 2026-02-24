import { Prisma } from '@prisma/client';

import { BusinessSort } from '../../dto/business-sort.enum';
import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';
import { buildAvailabilitySql } from '../fragments/availability.sql';
import { buildBaseBusinessFiltersSql } from '../fragments/base-business-filters.sql';
import { buildBusinessPriceFilterSql } from '../fragments/business-price-filter.sql';
import { buildDistanceSql } from '../fragments/distance.sql';
import { buildOpenNowSql } from '../fragments/open-now.sql';
import { buildServiceSearchSql } from '../fragments/service-search.sql';

/**
 * Counts total number of businesses matching filters.
 *
 * IMPORTANT:
 * - NO cursor
 * - NO limit
 * - NO order by
 */
export function buildBusinessesCountSql(query: NormalizedBusinessesQuery): Prisma.Sql {
  const { openNow, sort, lat, lng, radiusMeters } = query;

  // =====================================================
  // SPECIAL CASE: radius (withinKm)
  // =====================================================
  // When radiusMeters is provided, we must:
  // - join locations
  // - calculate distance
  // - filter by distance <= radius
  // - count via subquery to avoid duplications
  if (radiusMeters !== undefined) {
    const latitude = lat!;
    const longitude = lng!;

    /**
     * Haversine formula (meters)
     * Must be IDENTICAL to nearby.sql.ts
     */
    const distanceSql = buildDistanceSql(latitude, longitude);

    return Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT b.id
        FROM businesses b
        JOIN locations l ON l."businessId" = b.id

        WHERE b.status = 'ACTIVE'
          ${buildBaseBusinessFiltersSql(query)}
          ${openNow ? buildOpenNowSql('b') : Prisma.empty}
          ${buildServiceSearchSql(query, 'b')}
          ${buildAvailabilitySql(query, 'b')}
          ${buildBusinessPriceFilterSql(query, 'b')}
          AND ${distanceSql} <= ${radiusMeters}
      ) sub
    `;
  }

  // =====================================================
  // DEFAULT CASE (no radius)
  // =====================================================

  /**
   * NEARBY requires locations join
   * Other sorts do not
   */
  const needsLocationJoin = sort === BusinessSort.NEARBY;

  return Prisma.sql`
    SELECT COUNT(DISTINCT b.id)::int AS total
    FROM businesses b
    ${
      needsLocationJoin
        ? Prisma.sql`
          JOIN locations l ON l."businessId" = b.id
        `
        : Prisma.empty
    }

    WHERE b.status = 'ACTIVE'
      ${buildBaseBusinessFiltersSql(query)}
      ${openNow ? buildOpenNowSql('b') : Prisma.empty}
      ${buildServiceFilterSql(query, 'b')}
      ${buildBusinessPriceFilterSql(query, 'b')}
  `;
}

function buildServiceFilterSql(query: NormalizedBusinessesQuery, alias = 'b'): Prisma.Sql {
  return query.availabilityDate
    ? buildAvailabilitySql(query, alias)
    : buildServiceSearchSql(query, alias);
}
