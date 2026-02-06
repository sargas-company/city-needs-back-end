import { ApiProperty } from '@nestjs/swagger';

import { AdminVerificationListItemDto } from './admin-verification-list-item.dto';

export class AdminVerificationsMetaDto {
  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasNextPage!: boolean;
}

export class AdminVerificationsResponseDto {
  @ApiProperty({ type: [AdminVerificationListItemDto] })
  items!: AdminVerificationListItemDto[];

  @ApiProperty()
  meta!: AdminVerificationsMetaDto;
}
