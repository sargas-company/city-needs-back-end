import { Prisma } from '@prisma/client';

export function buildOpenNowSql(businessAlias = 'b'): Prisma.Sql {
  return Prisma.sql`
    AND EXISTS (
      SELECT 1
      FROM business_hours bh
      WHERE bh."businessId" = ${Prisma.raw(businessAlias)}.id
        AND (bh.weekday = (EXTRACT(DOW FROM (NOW() AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone")) + 6) % 7)
        AND bh."isClosed" = false
        AND (
          bh."is24h" = true
          OR (
            (NOW() AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone")::time >= bh."startTime"
            AND (NOW() AT TIME ZONE ${Prisma.raw(businessAlias)}."timeZone")::time < bh."endTime"
          )
        )
    )
  `;
}
