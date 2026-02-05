import { BusinessSort } from '../dto/business-sort.enum';
import { GetBusinessesQueryDto } from '../dto/get-businesses-query.dto';

export type NormalizedBusinessesQuery = {
  sort: BusinessSort;

  hasExplicitSort: boolean;
  hasBestPrice: boolean;
  hasTopRated: boolean;

  search?: string;
  categoryId?: string;
  city?: string;

  priceMin?: number;
  priceMax?: number;

  openNow: boolean;

  lat?: number;
  lng?: number;
  radiusMeters?: 1000 | 5000;

  availabilityDate?: string;
  availabilityTime?: string;

  limit: number;
  cursor?: string;

  userId?: string;
};

/**
 * Normalize layer
 *
 * Responsibilities:
 * - resolve aliases (bestPrice / topRated)
 * - resolve default sort
 * - canonicalize query shape
 * - DO NOT throw errors
 * - DO NOT validate business rules
 */
export function normalizeBusinessesQuery(
  query: GetBusinessesQueryDto,
  userId?: string,
): NormalizedBusinessesQuery {
  const hasExplicitSort = !!query.sort;
  const hasBestPrice = query.bestPrice === true;
  const hasTopRated = query.topRated === true;

  let sort = query.sort;

  // -----------------------------------------
  // Resolve aliases (flags override sort)
  // -----------------------------------------
  if (hasBestPrice) {
    sort = BusinessSort.PRICE_ASC;
  }

  if (hasTopRated) {
    sort = BusinessSort.TOP_RATED;
  }

  // -----------------------------------------
  // Default sort
  // -----------------------------------------
  if (!sort) {
    sort = BusinessSort.POPULAR;
  }

  // -----------------------------------------
  // Normalize search
  // -----------------------------------------
  const search =
    typeof query.search === 'string' && query.search.trim().length > 0
      ? query.search.trim()
      : undefined;

  // -----------------------------------------
  // Normalize availability
  // -----------------------------------------
  const availabilityDate =
    typeof query.availabilityDate === 'string' && query.availabilityDate.trim().length > 0
      ? query.availabilityDate.trim()
      : undefined;

  const availabilityTime =
    typeof query.availabilityTime === 'string' && query.availabilityTime.trim().length > 0
      ? query.availabilityTime.trim()
      : undefined;

  // -----------------------------------------
  // Normalize numbers
  // -----------------------------------------
  const priceMin = typeof query.priceMin === 'number' ? query.priceMin : undefined;

  const priceMax = typeof query.priceMax === 'number' ? query.priceMax : undefined;

  const lat = typeof query.lat === 'number' ? query.lat : undefined;
  const lng = typeof query.lng === 'number' ? query.lng : undefined;

  // -----------------------------------------
  // Normalize booleans
  // -----------------------------------------
  const openNow = query.openNow === true;

  // -----------------------------------------
  // Normalize radius
  // -----------------------------------------
  const withinKm = query.withinKm;
  let radiusMeters: 1000 | 5000 | undefined;

  if (withinKm === 1) {
    radiusMeters = 1000;
  } else if (withinKm === 5) {
    radiusMeters = 5000;
  }

  // -----------------------------------------
  // Normalize pagination
  // -----------------------------------------
  const limit = typeof query.limit === 'number' && query.limit > 0 ? query.limit : 10;

  const cursor =
    typeof query.cursor === 'string' && query.cursor.length > 0 ? query.cursor : undefined;

  return {
    sort,

    hasExplicitSort,
    hasBestPrice,
    hasTopRated,

    search,
    categoryId: query.categoryId,
    city: query.city,

    priceMin,
    priceMax,

    openNow,

    lat,
    lng,

    radiusMeters,

    availabilityDate,
    availabilityTime,

    limit,
    cursor,

    userId,
  };
}
