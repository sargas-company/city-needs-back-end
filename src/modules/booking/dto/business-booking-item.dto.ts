// src/modules/booking/dto/business-booking-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class BusinessBookingItemDto {
  @ApiProperty({ example: 'booking-uuid' })
  id!: string;

  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  userName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  userPhone?: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ example: '2026-02-20T14:00:00.000Z' })
  startAt!: string;

  @ApiProperty({ example: '2026-02-20T15:00:00.000Z' })
  endAt!: string;

  @ApiProperty({ example: '2026-02-10T09:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    description: 'List of service names included in this booking',
    example: ['Haircut', 'Beard Trim'],
  })
  services!: string[];

  @ApiProperty({
    description: 'Total price of all services',
    example: 5000,
  })
  totalPrice!: number;
}
