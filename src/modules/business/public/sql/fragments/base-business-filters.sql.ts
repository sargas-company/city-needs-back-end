import { Prisma } from '@prisma/client';

import { NormalizedBusinessesQuery } from '../../query/normalize-businesses-query';

export function buildBaseBusinessFiltersSql(
  query: NormalizedBusinessesQuery,
  alias = 'b',
): Prisma.Sql {
  const { categoryId, city } = query;

  return Prisma.sql`
    ${categoryId ? Prisma.sql`AND ${Prisma.raw(alias)}."categoryId" = ${categoryId}` : Prisma.empty}
    ${
      city
        ? Prisma.sql`
      AND EXISTS (
        SELECT 1
        FROM addresses a
        WHERE a.id = ${Prisma.raw(alias)}."addressId"
          AND a.city = ${city}
      )
    `
        : Prisma.empty
    }
  `;
}
