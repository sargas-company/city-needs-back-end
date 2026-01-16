// src/modules/locations/dto/address.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({ example: '123 Main St' })
  addressLine1!: string;

  @ApiProperty({ example: 'Saskatoon' })
  city!: string;

  @ApiProperty({ example: 'SK' })
  state!: string;

  @ApiProperty({ example: 'CA' })
  countryCode!: string;

  @ApiProperty({ example: 'S7K 3J8', required: false })
  zip?: string;
}
