import { ApiProperty } from '@nestjs/swagger';
import { CursorPaginationMetaDto } from 'src/common/dto/cursor-pagination.dto';

import { SavedBusinessCardDto } from './business-card.dto';

export class SavedBusinessesListSwaggerResponseDto {
  @ApiProperty({ example: 200 })
  code!: number;

  @ApiProperty({ type: [SavedBusinessCardDto] })
  data!: SavedBusinessCardDto[];

  @ApiProperty({ type: CursorPaginationMetaDto })
  meta!: CursorPaginationMetaDto;
}
