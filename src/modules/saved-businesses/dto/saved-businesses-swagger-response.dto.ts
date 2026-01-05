import { ApiProperty } from '@nestjs/swagger';
import { CursorPaginationMetaDto } from 'src/common/dto/cursor-pagination.dto';

import { BusinessCardDto } from './business-card.dto';

export class SavedBusinessesListSwaggerResponseDto {
  @ApiProperty({ example: 200 })
  code!: number;

  @ApiProperty({ type: [BusinessCardDto] })
  data!: BusinessCardDto[];

  @ApiProperty({ type: CursorPaginationMetaDto })
  meta!: CursorPaginationMetaDto;
}
