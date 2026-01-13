// src/modules/booking/booking.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { BookingService } from './booking.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Booking')
@ApiBearerAuth()
@UseGuards(DbUserAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create booking',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking successfully created',
    type: BookingResponseDto,
  })
  async create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    const booking = await this.bookingService.createBooking(user.id, dto);

    return successResponse({ data: booking }, 201);
  }
}
