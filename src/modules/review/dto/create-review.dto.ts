// src/modules/review/dto/create-review.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Booking ID for which the review is created',
    example: 'b3b1c8c4-4e5c-4d4f-9a4f-8c3f7a0a1234',
  })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional short review comment',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
