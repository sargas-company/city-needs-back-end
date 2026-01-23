import { BadRequestException } from '@nestjs/common';

import { BusinessCursor } from './types';
import { BUSINESS_SORT_RULES } from '../query/business-sort.rules';
import { NormalizedBusinessesQuery } from '../query/normalize-businesses-query';

export function decodeBusinessCursor(
  rawCursor: string,
  query: NormalizedBusinessesQuery,
): BusinessCursor {
  let decoded: BusinessCursor;

  // -----------------------------
  // base64 + JSON
  // -----------------------------
  try {
    const json = Buffer.from(rawCursor, 'base64').toString('utf8');
    decoded = JSON.parse(json);
  } catch {
    throw new BadRequestException('Invalid cursor encoding');
  }

  // -----------------------------
  // Basic shape validation
  // -----------------------------
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    typeof decoded.sort !== 'string' ||
    typeof decoded.values !== 'object' ||
    typeof decoded.filtersHash !== 'string'
  ) {
    throw new BadRequestException('Invalid cursor structure');
  }

  // -----------------------------
  // Sort match
  // -----------------------------
  if (decoded.sort !== query.sort) {
    throw new BadRequestException('Cursor does not match sorting strategy');
  }

  const rule = BUSINESS_SORT_RULES[query.sort];
  if (!rule) {
    throw new BadRequestException('Unsupported sorting strategy');
  }

  // -----------------------------
  // Cursor fields validation
  // -----------------------------
  for (const field of rule.cursorFields) {
    if (!(field in decoded.values)) {
      throw new BadRequestException(`Cursor is missing required field: ${field}`);
    }
  }

  return decoded;
}
