// src/modules/booking/dto/booking-list-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class BookingListItemDto {
  @ApiProperty({ example: 'booking-uuid' })
  id!: string;

  @ApiProperty({ example: 'business-uuid' })
  businessId!: string;

  @ApiProperty({ example: 'Joe Barber Shop' })
  businessName!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ example: '2026-01-20T14:00:00.000Z' })
  startAt!: string;

  @ApiProperty({ example: '2026-01-20T15:00:00.000Z' })
  endAt!: string;

  @ApiProperty({ example: '2026-01-10T09:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    description: 'Indicates whether a review already exists for this booking',
    example: false,
  })
  hasReview!: boolean;
}
