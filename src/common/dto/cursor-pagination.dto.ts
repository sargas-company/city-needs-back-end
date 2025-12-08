import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationMetaDto {
  @ApiProperty({ nullable: true })
  declare nextCursor: string | null;

  @ApiProperty()
  declare totalCount: number;

  @ApiProperty()
  declare totalPages: number;

  @ApiProperty()
  declare hasNextPage: boolean;
}

export class CursorPaginationResponseDto<T> {
  @ApiProperty({ isArray: true })
  declare data: T[];

  @ApiProperty({ type: CursorPaginationMetaDto })
  declare meta: CursorPaginationMetaDto;
}

export class CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Cursor to continue from', example: '' })
  cursor?: string;

  @ApiPropertyOptional({ description: 'Max number of items to return', default: 10 })
  limit?: number;
}
