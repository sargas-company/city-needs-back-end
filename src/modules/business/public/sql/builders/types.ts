import { Prisma } from '@prisma/client';

export type SqlBuilderResult<Row> = {
  sql: Prisma.Sql;

  extractCursorValues: (this: void, row: Row) => Record<string, number | string>;
};
