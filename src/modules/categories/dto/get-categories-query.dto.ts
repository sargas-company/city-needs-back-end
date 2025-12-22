import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

const toBoolean = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
};

export class GetCategoriesQueryDto {
  @ApiPropertyOptional({
    description: 'Search by title or description (case-insensitive contains)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by requiresVerification' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  requiresVerification?: boolean;

  @ApiPropertyOptional({ description: 'Filter by gracePeriodHours presence' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  hasGracePeriod?: boolean;
}
