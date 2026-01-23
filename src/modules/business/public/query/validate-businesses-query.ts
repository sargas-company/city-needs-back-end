import { BadRequestException } from '@nestjs/common';

import { NormalizedBusinessesQuery } from './normalize-businesses-query';
import { BusinessSort } from '../dto/business-sort.enum';

/**
 * Conflict & consistency validator
 *
 * Responsibilities:
 * - validate conflicting params
 * - validate required params per sort
 * - validate basic cursor presence
 * - THROW BadRequestException on any violation
 */
export function validateBusinessesQuery(query: NormalizedBusinessesQuery): void {
  const {
    sort,
    search,
    priceMin,
    priceMax,
    lat,
    lng,
    radiusMeters,
    openNow,
    cursor,

    hasExplicitSort,
    hasBestPrice,
    hasTopRated,
  } = query;

  // =====================================================
  // 1. Sorting conflicts (mutually exclusive)
  // =====================================================
  const sortSourcesCount = [hasExplicitSort, hasBestPrice, hasTopRated].filter(Boolean).length;

  if (sortSourcesCount > 1) {
    throw new BadRequestException('Conflicting sorting parameters');
  }

  // bestPrice + topRated already resolved to sort,
  // but invalid combinations can still arrive via sort
  if (sort === BusinessSort.PRICE_ASC || sort === BusinessSort.PRICE_DESC) {
    if (!search) {
      throw new BadRequestException('PRICE sorting requires search parameter');
    }
  }

  // =====================================================
  // 2. Required params per sort
  // =====================================================

  if (sort === BusinessSort.NEARBY) {
    if (lat === undefined || lng === undefined) {
      throw new BadRequestException('NEARBY sorting requires lat and lng parameters');
    }
  }

  if (
    (lat !== undefined || lng !== undefined) &&
    sort !== BusinessSort.NEARBY &&
    radiusMeters === undefined
  ) {
    throw new BadRequestException(
      'lat and lng can only be used with NEARBY sorting or withinKm filter',
    );
  }

  // =====================================================
  // 2.1 Radius (withinKm) constraints
  // =====================================================

  if (radiusMeters !== undefined) {
    // radius requires coordinates
    if (lat === undefined || lng === undefined) {
      throw new BadRequestException('withinKm requires lat and lng parameters');
    }

    // safety check (should not happen if DTO is correct)
    if (radiusMeters !== 1000 && radiusMeters !== 5000) {
      throw new BadRequestException('Invalid radius value');
    }
  }

  // =====================================================
  // 3. Price filters validation
  // =====================================================

  if ((priceMin !== undefined || priceMax !== undefined) && !search) {
    throw new BadRequestException('priceMin/priceMax require search parameter');
  }

  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    throw new BadRequestException('priceMin cannot be greater than priceMax');
  }

  // =====================================================
  // 4. openNow constraints
  // =====================================================

  // openNow must always go through raw SQL path
  // validator ensures it is not silently ignored
  if (openNow && !hasExplicitSort && !hasBestPrice && !hasTopRated) {
    throw new BadRequestException('openNow requires explicit sorting strategy');
  }

  // =====================================================
  // 5. Cursor basic validation
  // =====================================================

  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || cursor.length === 0) {
      throw new BadRequestException('Invalid cursor value');
    }

    // Full cursor decoding & validation happens later,
    // but here we block obviously invalid cases
    try {
      Buffer.from(cursor, 'base64').toString('utf8');
    } catch {
      throw new BadRequestException('Cursor must be base64 encoded');
    }
  }
}
