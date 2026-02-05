import { Prisma } from '@prisma/client';

/**
 * Builds SQL fragment for checking if business is saved by user
 *
 * Returns:
 * - LEFT JOIN to saved_businesses
 * - SELECT expression for isSaved boolean
 *
 * Usage in SQL builder:
 * ```
 * const { leftJoin, selectExpr } = buildIsSavedSql(userId, 'b');
 *
 * SELECT
 *   b.id,
 *   ${selectExpr} AS "isSaved"
 * FROM businesses b
 * ${leftJoin}
 * ```
 */
export function buildIsSavedSql(
  userId: string | undefined,
  businessAlias = 'b',
): {
  leftJoin: Prisma.Sql;
  selectExpr: Prisma.Sql;
} {
  if (!userId) {
    // No user = no saved businesses
    return {
      leftJoin: Prisma.empty,
      selectExpr: Prisma.sql`FALSE`,
    };
  }

  return {
    leftJoin: Prisma.sql`
      LEFT JOIN saved_businesses sb
        ON sb."businessId" = ${Prisma.raw(businessAlias)}.id
        AND sb."userId" = ${userId}
    `,
    selectExpr: Prisma.sql`(sb.id IS NOT NULL)`,
  };
}
