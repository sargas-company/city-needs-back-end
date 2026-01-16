// src/modules/business/dto/update-business-profile.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpdateBusinessHoursDto } from 'src/modules/business-hours/dto/update-business-hours.dto';

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Provides on-site services' })
  @IsOptional()
  @IsBoolean()
  serviceOnSite?: boolean;

  @ApiPropertyOptional({ description: 'Provides services in studio' })
  @IsOptional()
  @IsBoolean()
  serviceInStudio?: boolean;

  @ApiPropertyOptional({
    description: 'Average service price per hour',
    example: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: [UpdateBusinessHoursDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBusinessHoursDto)
  businessHours?: UpdateBusinessHoursDto[];
}
