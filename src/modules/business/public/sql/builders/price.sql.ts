import { Prisma } from '@prisma/client';

import { SqlBuilderResult } from './types';
import { BusinessSort } from '../../dto/business-sort.enum';
import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';
import { buildAvailabilitySql } from '../fragments/availability.sql';
import { buildBaseBusinessFiltersSql } from '../fragments/base-business-filters.sql';
import { buildBusinessPriceFilterSql } from '../fragments/business-price-filter.sql';
import { buildDistanceSql } from '../fragments/distance.sql';
import { buildIsSavedSql } from '../fragments/is-saved.sql';
import { buildOpenNowSql } from '../fragments/open-now.sql';
import { buildServiceSearchSql } from '../fragments/service-search.sql';

/**
 * PRICE_ASC / PRICE_DESC sorting
 *
 * With search:
 *   - service-matched businesses come first, sorted by MIN(matched service price)
 *   - name-matched businesses come second, sorted by business.price
 *   - deterministic cursor: (hasServiceMatch, price, id)
 *
 * Without search:
 *   - price = business.price (owner-set average price)
 *   - deterministic cursor: (price, id)
 *
 * distance is returned ONLY when withinKm is used
 */
export function buildPriceBusinessesSql(
  query: NormalizedBusinessesQuery,
  decodedCursor: {
    values: {
      hasServiceMatch?: number;
      price: number;
      id: string;
    };
  } | null,
): SqlBuilderResult<{
  id: string;
  price: number;
  hasServiceMatch?: number;
  distance?: number;
}> {
  const { limit, openNow, sort, lat, lng, radiusMeters, userId } = query;

  const isAsc = sort === BusinessSort.PRICE_ASC;

  const needsDistance = radiusMeters !== undefined;
  const distanceSql =
    needsDistance && lat !== undefined && lng !== undefined ? buildDistanceSql(lat, lng) : null;

  const { leftJoin: isSavedJoin, selectExpr: isSavedExpr } = buildIsSavedSql(userId, 'b');

  const hasSearch = !!query.search;

  const searchPattern = hasSearch ? '%' + query.search + '%' : null;

  /**
   * Cursor condition (applied on outer query)
   */
  const cursorCondition = buildPriceCursorCondition(decodedCursor, isAsc, hasSearch);

  const innerSql = hasSearch
    ? Prisma.sql`
        SELECT
          b.id,
          COALESCE(MIN(s.price), b.price)::int AS price,
          CASE WHEN COUNT(s.id) > 0 THEN 1 ELSE 0 END AS "hasServiceMatch",
          ${isSavedExpr} AS "isSaved"
        FROM businesses b
        LEFT JOIN business_services s
          ON s."businessId" = b.id
          AND s.status = 'ACTIVE'
          AND s.name ILIKE ${searchPattern}
        ${isSavedJoin}

        WHERE b.status = 'ACTIVE'
          ${buildBaseBusinessFiltersSql(query)}
          ${openNow ? buildOpenNowSql('b') : Prisma.empty}
          ${
            query.availabilityDate
              ? buildAvailabilitySql(query, 'b')
              : buildServiceSearchSql(query, 'b')
          }

        GROUP BY b.id, b.price, ${isSavedExpr}
      `
    : Prisma.sql`
        SELECT
          b.id,
          b.price,
          ${isSavedExpr} AS "isSaved"
        FROM businesses b
        ${isSavedJoin}

        WHERE b.status = 'ACTIVE'
          ${buildBaseBusinessFiltersSql(query)}
          ${openNow ? buildOpenNowSql('b') : Prisma.empty}
          ${buildBusinessPriceFilterSql(query)}
      `;

  /**
   * Outer query: shared between both branches
   * - distance is calculated ONLY in outer query
   */
  const sql = Prisma.sql`
    SELECT
      sub.id,
      sub.price
      ${hasSearch ? Prisma.sql`, sub."hasServiceMatch"` : Prisma.empty}
      ${distanceSql ? Prisma.sql`, ${distanceSql} AS distance` : Prisma.empty},
      sub."isSaved"
    FROM (
      ${innerSql}
    ) sub
    ${distanceSql ? Prisma.sql`JOIN locations l ON l."businessId" = sub.id` : Prisma.empty}
    ${cursorCondition}
    ${
      distanceSql && radiusMeters ? Prisma.sql`AND ${distanceSql} <= ${radiusMeters}` : Prisma.empty
    }

    ORDER BY
      ${hasSearch ? Prisma.sql`sub."hasServiceMatch" DESC,` : Prisma.empty}
      sub.price ${isAsc ? Prisma.sql`ASC` : Prisma.sql`DESC`},
      sub.id DESC

    LIMIT ${limit + 1}
  `;

  return {
    sql,
    extractCursorValues: (row): Record<string, number | string> => {
      if (hasSearch) {
        return {
          hasServiceMatch: row.hasServiceMatch ?? 0,
          price: row.price,
          id: row.id,
        };
      }
      return {
        price: row.price,
        id: row.id,
      };
    },
  };
}

/**
 * Builds cursor condition for price sorting.
 *
 * With search: 3-column cursor (hasServiceMatch DESC, price ASC/DESC, id DESC)
 * Without search: 2-column cursor (price ASC/DESC, id DESC)
 */
function buildPriceCursorCondition(
  decodedCursor: {
    values: {
      hasServiceMatch?: number;
      price: number;
      id: string;
    };
  } | null,
  isAsc: boolean,
  hasSearch: boolean,
): Prisma.Sql {
  if (!decodedCursor) return Prisma.empty;

  const { price, id } = decodedCursor.values;
  const priceOp = isAsc ? Prisma.sql`>` : Prisma.sql`<`;

  if (!hasSearch) {
    return Prisma.sql`
      WHERE
        sub.price ${priceOp} ${price}
        OR (
          sub.price = ${price}
          AND sub.id < ${id}
        )
    `;
  }

  const hsm = decodedCursor.values.hasServiceMatch ?? 1;

  return Prisma.sql`
    WHERE
      sub."hasServiceMatch" < ${hsm}
      OR (
        sub."hasServiceMatch" = ${hsm}
        AND sub.price ${priceOp} ${price}
      )
      OR (
        sub."hasServiceMatch" = ${hsm}
        AND sub.price = ${price}
        AND sub.id < ${id}
      )
  `;
}
