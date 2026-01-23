import { BusinessSort } from '../dto/business-sort.enum';

/**
 * Contract describing what each sorting strategy:
 * - requires
 * - supports
 * - how cursor is built
 *
 * This is the SINGLE source of truth.
 */
export type BusinessSortRule = {
  /** Sorting requires non-empty search */
  requiresSearch?: boolean;

  /** Sorting requires lat & lng */
  requiresLatLng?: boolean;

  /** Sorting supports openNow (DB-level only) */
  supportsOpenNow: boolean;

  /**
   * Cursor fields order (priority order).
   * Always implicitly ends with `id`.
   */
  cursorFields: string[];
};

export const BUSINESS_SORT_RULES: Record<BusinessSort, BusinessSortRule> = {
  [BusinessSort.POPULAR]: {
    requiresSearch: false,
    supportsOpenNow: true,
    cursorFields: ['popularity', 'id'],
  },

  [BusinessSort.TOP_RATED]: {
    requiresSearch: false,
    supportsOpenNow: true,
    cursorFields: ['ratingAvg', 'ratingCount', 'id'],
  },

  [BusinessSort.PRICE_ASC]: {
    requiresSearch: true,
    supportsOpenNow: true,
    cursorFields: ['price', 'id'],
  },

  [BusinessSort.PRICE_DESC]: {
    requiresSearch: true,
    supportsOpenNow: true,
    cursorFields: ['price', 'id'],
  },

  [BusinessSort.NEARBY]: {
    requiresLatLng: true,
    supportsOpenNow: true,
    cursorFields: ['distance', 'id'],
  },
};
