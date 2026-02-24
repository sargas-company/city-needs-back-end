import { Prisma } from '@prisma/client';

import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';

export function buildServiceSearchSql(
  query: NormalizedBusinessesQuery,
  businessAlias = 'b',
): Prisma.Sql {
  const { search, priceMin, priceMax } = query;

  if (!search) {
    return Prisma.empty;
  }

  const searchPattern = '%' + search + '%';
  const hasPriceFilter = priceMin !== undefined || priceMax !== undefined;

  return Prisma.sql`
    AND (
      ${Prisma.raw(businessAlias)}.name ILIKE ${searchPattern}
      OR EXISTS (
        SELECT 1
        FROM business_services s
        WHERE s."businessId" = ${Prisma.raw(businessAlias)}.id
          AND s.status = 'ACTIVE'
          AND s.name ILIKE ${searchPattern}
      )
    )
    ${
      hasPriceFilter
        ? Prisma.sql`
            AND (
              EXISTS (
                SELECT 1
                FROM business_services sp
                WHERE sp."businessId" = ${Prisma.raw(businessAlias)}.id
                  AND sp.status = 'ACTIVE'
                  AND sp.price BETWEEN ${priceMin ?? 0} AND ${priceMax ?? 1000000}
              )
              OR (
                NOT EXISTS (
                  SELECT 1
                  FROM business_services sp2
                  WHERE sp2."businessId" = ${Prisma.raw(businessAlias)}.id
                    AND sp2.status = 'ACTIVE'
                )
                AND ${Prisma.raw(businessAlias)}.price BETWEEN ${priceMin ?? 0} AND ${priceMax ?? 1000000}
              )
            )
          `
        : Prisma.empty
    }
  `;
}
