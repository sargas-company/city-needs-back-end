import crypto from 'crypto';

import { NormalizedBusinessesQuery } from '../query/normalize-businesses-query';

/**
 * Produces deterministic hash of query filters
 * Used to prevent cursor reuse with different filters
 */
export function hashBusinessFilters(query: NormalizedBusinessesQuery): string {
  const filterPayload = {
    sort: query.sort,
    search: query.search,
    categoryId: query.categoryId,
    city: query.city,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    openNow: query.openNow,
    lat: query.lat,
    lng: query.lng,
    radiusMeters: query.radiusMeters,
  };

  return crypto.createHash('sha256').update(JSON.stringify(filterPayload)).digest('hex');
}
