// src/modules/booking/dto/booking-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class BookingResponseDto {
  @ApiProperty({
    example: '9d7c0e0e-6c9b-4c2b-bf8a-3a0f2b0f9c11',
  })
  id!: string;

  @ApiProperty({
    example: 'cbbe512e-9f37-43ec-91ec-382581053e6d',
  })
  businessId!: string;

  @ApiProperty({
    example: 'f7b9c7a2-8b1e-4e7c-9a92-1c8f9d4a1b23',
  })
  userId!: string;

  @ApiProperty({
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  status!: BookingStatus;

  @ApiProperty({
    example: '2026-01-12T16:00:00.000Z',
  })
  startAt!: string;

  @ApiProperty({
    example: '2026-01-12T17:00:00.000Z',
  })
  endAt!: string;

  @ApiProperty({
    example: 60,
  })
  totalDurationMinutes!: number;

  @ApiProperty({
    type: [String],
    example: ['b1a84c08-98c1-478c-9a30-52aaf0614a3c'],
  })
  serviceIds!: string[];

  @ApiProperty({
    example: '2026-01-05T10:12:33.123Z',
  })
  createdAt!: string;
}
