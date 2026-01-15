import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewListItemDto {
  @ApiProperty({ example: 'review-uuid' })
  id!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiPropertyOptional({ example: 'Great service!' })
  comment?: string | null;

  @ApiProperty({ example: '2026-01-14T10:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ example: 'John D.' })
  authorName?: string | null;
}
