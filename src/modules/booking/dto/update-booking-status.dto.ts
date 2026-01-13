// src/modules/booking/dto/update-booking-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
    example: BookingStatus.CONFIRMED,
    description: 'New booking status (owner only)',
  })
  @IsEnum([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
  status!: BookingStatus;
}
