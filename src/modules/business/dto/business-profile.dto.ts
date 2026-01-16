// src/modules/business/dto/business-profile.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class BusinessProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  serviceOnSite!: boolean;

  @ApiProperty()
  serviceInStudio!: boolean;
}
