// src/modules/booking/dto/booking-list-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { CursorPaginationMetaDto } from 'src/common/dto/cursor-pagination.dto';

import { BookingListItemDto } from './booking-list-item.dto';

export class BookingListResponseDto {
  @ApiProperty({ type: [BookingListItemDto] })
  data!: BookingListItemDto[];

  @ApiProperty({ type: CursorPaginationMetaDto })
  meta!: CursorPaginationMetaDto;
}
