// src/modules/locations/dto/address-search-query.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { CITIES } from 'src/common/config/cities.config';

const CITY_KEYS = Object.keys(CITIES);

export class AddressSearchQueryDto {
  @ApiProperty({
    example: 'Saskatoon',
    enum: CITY_KEYS,
    description: 'Allowed city',
  })
  @IsString()
  @IsIn(CITY_KEYS)
  city!: keyof typeof CITIES;

  @ApiProperty({
    example: 'Main St 123',
    description: 'Street and building input',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  query!: string;
}
