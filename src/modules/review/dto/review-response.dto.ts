// src/modules/review/dto/review-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: 'review-uuid' })
  id!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiPropertyOptional({ example: 'Amazing experience!' })
  comment?: string | null;

  @ApiProperty({ example: '2026-01-14T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-14T10:05:00.000Z' })
  updatedAt!: Date;
}
