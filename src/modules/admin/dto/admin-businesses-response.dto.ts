import { ApiProperty } from '@nestjs/swagger';

import { AdminBusinessListItemDto } from './admin-business-list-item.dto';

export class AdminBusinessesMetaDto {
  @ApiProperty({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasNextPage!: boolean;
}

export class AdminBusinessesResponseDto {
  @ApiProperty({ type: [AdminBusinessListItemDto] })
  items!: AdminBusinessListItemDto[];

  @ApiProperty()
  meta!: AdminBusinessesMetaDto;
}
