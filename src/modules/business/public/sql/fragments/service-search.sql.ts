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

  return Prisma.sql`
    AND EXISTS (
      SELECT 1
      FROM business_services s
      WHERE s."businessId" = ${Prisma.raw(businessAlias)}.id
        AND s.status = 'ACTIVE'
        AND s.name ILIKE ${'%' + search + '%'}
        ${
          priceMin !== undefined || priceMax !== undefined
            ? Prisma.sql`
                AND s.price BETWEEN ${priceMin ?? 0} AND ${priceMax ?? 1000000}
              `
            : Prisma.empty
        }
    )
  `;
}
