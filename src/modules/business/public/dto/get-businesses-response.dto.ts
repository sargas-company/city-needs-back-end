// src/modules/business/public/dto/get-businesses-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

import { BusinessCardDto } from './business-card.dto';
import { BusinessesCursorMetaDto } from './businesses-cursor-meta.dto';

export class GetBusinessesResponseDto {
  @ApiProperty({ type: [BusinessCardDto] })
  data!: BusinessCardDto[];

  @ApiProperty({ type: BusinessesCursorMetaDto })
  meta!: BusinessesCursorMetaDto;
}
