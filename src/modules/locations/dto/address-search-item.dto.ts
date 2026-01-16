// src/modules/locations/dto/address-search-item.dto.ts

import { ApiProperty } from '@nestjs/swagger';

import { AddressDto } from './address.dto';
import { LocationDto } from './location.dto';

export class AddressSearchItemDto {
  @ApiProperty({
    example: '123 Main St, Saskatoon, SK, Canada',
  })
  label!: string;

  @ApiProperty()
  location!: LocationDto;

  @ApiProperty()
  address!: AddressDto;

  @ApiProperty({
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  })
  placeId!: string;
}
