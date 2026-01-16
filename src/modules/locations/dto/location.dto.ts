// src/modules/locations/dto/location.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ example: 52.133214 })
  lat!: number;

  @ApiProperty({ example: -106.670045 })
  lng!: number;
}
