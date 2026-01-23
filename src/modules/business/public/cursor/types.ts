import { BusinessSort } from '../dto/business-sort.enum';

export type BusinessCursor = {
  sort: BusinessSort;
  values: Record<string, number | string>;
  filtersHash: string;
};
