// src/modules/booking/dto/create-booking.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID, IsString, Matches } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Business ID',
    example: 'cbbe512e-9f37-43ec-91ec-382581053e6d',
    format: 'uuid',
  })
  @IsUUID('4')
  businessId!: string;

  @ApiProperty({
    description: 'Selected business service IDs',
    example: ['b1a84c08-98c1-478c-9a30-52aaf0614a3c'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @ApiProperty({
    description: 'Booking start datetime in BUSINESS LOCAL TIME (YYYY-MM-DDTHH:mm)',
    example: '2026-01-14T22:40',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
    message: 'startAt must be in format YYYY-MM-DDTHH:mm',
  })
  startAt!: string;
}
