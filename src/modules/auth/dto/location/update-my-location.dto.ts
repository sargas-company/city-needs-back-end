import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateMyLocationDto {
  @ApiProperty({ example: 43.6532, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: -79.3832, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({ enum: LocationSource, example: LocationSource.gps })
  @IsEnum(LocationSource)
  source!: LocationSource;

  @ApiPropertyOptional({ example: 'google', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  provider?: string;

  @ApiPropertyOptional({ example: 'place-id-123', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  placeId?: string;

  @ApiPropertyOptional({ example: '123 Main St, Toronto, ON', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  formattedAddress?: string;
}
