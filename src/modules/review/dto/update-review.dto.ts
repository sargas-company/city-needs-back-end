// src/modules/review/dto/update-review.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: 'Updated rating (1–5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Updated review comment',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
