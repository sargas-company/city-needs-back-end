import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessServiceStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateBusinessServiceDto {
  @ApiPropertyOptional({
    example: 'Premium Haircut',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({
    example: 3500,
    description: 'Service price in smallest currency unit',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number;

  @ApiPropertyOptional({
    example: 90,
    description: 'Service duration in minutes',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Service position in list',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    enum: BusinessServiceStatus,
    example: BusinessServiceStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(BusinessServiceStatus)
  status?: BusinessServiceStatus;
}
