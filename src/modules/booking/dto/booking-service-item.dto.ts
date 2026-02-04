// src/modules/booking/dto/booking-service-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class BookingServiceItemDto {
  @ApiProperty({ example: 'service-uuid' })
  id!: string;

  @ApiProperty({ example: 'Haircut' })
  name!: string;

  @ApiProperty({ example: 500 })
  price!: number;

  @ApiProperty({ example: 30, description: 'Duration in minutes' })
  duration!: number;
}
