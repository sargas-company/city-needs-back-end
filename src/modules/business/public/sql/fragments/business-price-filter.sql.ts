import { Prisma } from '@prisma/client';

import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';

/**
 * Filters by business.price (owner-set average price).
 *
 * Applied ONLY when search is absent.
 * When search IS present, price filtering is handled by
 * service-search.sql.ts on service-level prices.
 */
export function buildBusinessPriceFilterSql(
  query: NormalizedBusinessesQuery,
  alias = 'b',
): Prisma.Sql {
  if (query.search) return Prisma.empty;

  const { priceMin, priceMax } = query;

  if (priceMin === undefined && priceMax === undefined) {
    return Prisma.empty;
  }

  return Prisma.sql`
    ${priceMin !== undefined ? Prisma.sql`AND ${Prisma.raw(alias)}.price >= ${priceMin}` : Prisma.empty}
    ${priceMax !== undefined ? Prisma.sql`AND ${Prisma.raw(alias)}.price <= ${priceMax}` : Prisma.empty}
  `;
}
