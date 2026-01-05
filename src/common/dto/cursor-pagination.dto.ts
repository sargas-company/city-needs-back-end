import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
  @ApiPropertyOptional({
    description: 'Cursor to continue from',
    example: 'uuid-or-cursor-string',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Max number of items to return',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
