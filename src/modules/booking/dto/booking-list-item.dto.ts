// src/modules/booking/dto/booking-list-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

import { BookingServiceItemDto } from './booking-service-item.dto';

export class BusinessLogoDto {
  @ApiProperty({ example: 'file-uuid' })
  id!: string;

  @ApiProperty({ example: 'https://example.com/logo.png' })
  url!: string;
}

export class BookingListItemDto {
  @ApiProperty({ example: 'booking-uuid' })
  id!: string;

  @ApiProperty({ example: 'business-uuid' })
  businessId!: string;

  @ApiProperty({ example: 'Joe Barber Shop' })
  businessName!: string;

  @ApiPropertyOptional({ type: BusinessLogoDto, nullable: true })
  businessLogo!: BusinessLogoDto | null;

  @ApiPropertyOptional({ example: '+1234567890', nullable: true })
  businessPhone!: string | null;

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

  @ApiProperty({ type: [BookingServiceItemDto], description: 'Services included in this booking' })
  services!: BookingServiceItemDto[];

  @ApiProperty({ example: 1500, description: 'Total price (sum of all service prices)' })
  totalPrice!: number;
}
