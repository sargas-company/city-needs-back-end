// src/modules/reels/public/dto/get-reels-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class GetReelsQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination',
    example: 'opaque-cursor-string',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    default: 10,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search by business name',
    example: 'Grooming',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by business category',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
