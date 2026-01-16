// src/modules/locations/dto/address-search-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

import { AddressSearchItemDto } from './address-search-item.dto';

export class AddressSearchResponseDto {
  @ApiProperty({
    type: [AddressSearchItemDto],
  })
  items!: AddressSearchItemDto[];
}
