import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { City, CITIES } from 'src/common/config/cities.config';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination.dto';

import { BusinessSort } from './business-sort.enum';

export class GetBusinessesQueryDto extends CursorPaginationQueryDto {
  // ------------------------------------------------------------
  // SEARCH
  // ------------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Search by service name (case-insensitive)',
    example: 'Grooming',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // ------------------------------------------------------------
  // CATEGORY
  // ------------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Filter by category id',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // ------------------------------------------------------------
  // CITY
  // ------------------------------------------------------------
  @ApiPropertyOptional({
    description: 'City filter',
    enum: Object.keys(CITIES),
    example: 'Saskatoon',
  })
  @IsOptional()
  @IsEnum(Object.keys(CITIES))
  city?: City;

  // ------------------------------------------------------------
  // PRICE FILTER (services-based, requires search)
  // ------------------------------------------------------------
  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax?: number;

  // ------------------------------------------------------------
  // SORT
  // ------------------------------------------------------------
  @ApiPropertyOptional({
    enum: BusinessSort,
    description: 'Sorting mode',
    default: BusinessSort.POPULAR,
  })
  @IsOptional()
  @IsEnum(BusinessSort)
  sort?: BusinessSort;

  // ------------------------------------------------------------
  // GEO (NEARBY)
  // ------------------------------------------------------------
  @ApiPropertyOptional({
    description: 'User latitude (required for nearby)',
    example: 52.1332,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: 'User longitude (required for nearby)',
    example: -106.67,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  // ------------------------------------------------------------
  // GEO RADIUS
  // ------------------------------------------------------------
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsEnum([1, 5])
  withinKm?: 1 | 5;

  // ------------------------------------------------------------
  // OPEN NOW
  // ------------------------------------------------------------
  @ApiPropertyOptional({
    description:
      'Show only businesses that are open right now (based on business timezone and hours)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  openNow?: boolean;

  // ------------------------------------------------------------
  // FLAGS
  // ------------------------------------------------------------
  @ApiPropertyOptional({ description: 'Best price shortcut (PRICE_ASC)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bestPrice?: boolean;

  @ApiPropertyOptional({ description: 'Top rated shortcut (TOP_RATED)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  topRated?: boolean;
}
