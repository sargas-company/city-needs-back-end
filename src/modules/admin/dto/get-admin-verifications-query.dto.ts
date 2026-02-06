import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessVerificationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class GetAdminVerificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Max number of items to return',
    example: 20,
    default: 20,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (base64 encoded)',
    example: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTAxVDA5OjAwOjAwLjAwMFoiLCJpZCI6IjEyMyJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Verification status filter',
    enum: BusinessVerificationStatus,
    example: BusinessVerificationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(BusinessVerificationStatus)
  status?: BusinessVerificationStatus;

  @ApiPropertyOptional({
    description: 'Search by business name',
    example: 'barber',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by city (business address)',
    example: 'Saskatoon',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by business category ID',
    example: 'a3c1c8c4-4e5c-4d4f-9a4f-8c3f7a0a1234',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
