import { buildNearbyBusinessesSql } from './nearby.sql';
import { buildPopularBusinessesSql } from './popular.sql';
import { buildPriceBusinessesSql } from './price.sql';
import { buildTopRatedBusinessesSql } from './top-rated.sql';
import { BusinessSort } from '../../dto/business-sort.enum';

export const BUSINESS_SQL_BUILDERS = {
  [BusinessSort.POPULAR]: buildPopularBusinessesSql,
  [BusinessSort.TOP_RATED]: buildTopRatedBusinessesSql,
  [BusinessSort.PRICE_ASC]: buildPriceBusinessesSql,
  [BusinessSort.PRICE_DESC]: buildPriceBusinessesSql,
  [BusinessSort.NEARBY]: buildNearbyBusinessesSql,
} as const;
