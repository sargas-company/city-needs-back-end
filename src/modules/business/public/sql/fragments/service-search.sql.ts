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

  return Prisma.sql`
    AND (
      ${Prisma.raw(businessAlias)}.name ILIKE ${searchPattern}
      OR EXISTS (
        SELECT 1
        FROM business_services s
        WHERE s."businessId" = ${Prisma.raw(businessAlias)}.id
          AND s.status = 'ACTIVE'
          AND s.name ILIKE ${searchPattern}
          ${
            priceMin !== undefined || priceMax !== undefined
              ? Prisma.sql`
                  AND s.price BETWEEN ${priceMin ?? 0} AND ${priceMax ?? 1000000}
                `
              : Prisma.empty
          }
      )
    )
  `;
}
