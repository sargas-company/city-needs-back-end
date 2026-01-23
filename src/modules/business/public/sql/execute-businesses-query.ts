import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { NormalizedBusinessesQuery } from '../query/normalize-businesses-query';
import { BUSINESS_SQL_BUILDERS } from './builders/registry';
import { decodeBusinessCursor } from '../cursor/decode-business-cursor';
import { encodeBusinessCursor } from '../cursor/encode-business-cursor';
import { hashBusinessFilters } from '../cursor/hash-business-filters';
import { BusinessCursor } from '../cursor/types';

export async function executeBusinessesQuery(
  prisma: PrismaClient,
  query: NormalizedBusinessesQuery,
): Promise<{
  rows: any[];
  nextCursor: string | null;
  hasNextPage: boolean;
}> {
  const builder = BUSINESS_SQL_BUILDERS[query.sort];

  if (!builder) {
    throw new BadRequestException('Unsupported sorting strategy');
  }

  // --------------------------------------------------
  // Cursor decode (if present)
  // --------------------------------------------------
  const filtersHash = hashBusinessFilters(query);

  let decodedCursor: BusinessCursor | null = null;

  if (query.cursor) {
    decodedCursor = decodeBusinessCursor(query.cursor, query);

    if (decodedCursor.filtersHash !== filtersHash) {
      throw new BadRequestException('Cursor does not match current filters');
    }
  }

  // --------------------------------------------------
  // Build SQL
  // --------------------------------------------------
  const { sql, extractCursorValues } = builder(
    query,
    decodedCursor ? (decodedCursor as any) : null,
  );

  // --------------------------------------------------
  // Execute SQL
  // --------------------------------------------------
  const rows = await prisma.$queryRaw<any[]>(sql);

  const hasNextPage = rows.length > query.limit;
  const sliced = hasNextPage ? rows.slice(0, query.limit) : rows;

  // --------------------------------------------------
  // Encode next cursor
  // --------------------------------------------------
  let nextCursor: string | null = null;

  if (hasNextPage && sliced.length > 0) {
    const lastRow = sliced[sliced.length - 1];

    const cursorPayload: BusinessCursor = {
      sort: query.sort,
      values: extractCursorValues(lastRow),
      filtersHash,
    };

    nextCursor = encodeBusinessCursor(cursorPayload);
  }

  return {
    rows: sliced,
    hasNextPage,
    nextCursor,
  };
}
