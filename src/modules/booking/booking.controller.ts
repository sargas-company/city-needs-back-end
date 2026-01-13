// src/modules/booking/booking.controller.ts
import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { BookingService } from './booking.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

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

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: '6f559fed-0f11-4cf5-9831-4da96e0299ef',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking successfully cancelled',
    type: BookingResponseDto,
  })
  async cancel(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
    @Body() dto: CancelBookingDto,
  ) {
    const booking = await this.bookingService.cancelBooking(
      bookingId,
      {
        userId: user.id,
        role: user.role!,
      },
      dto,
    );

    return successResponse({ data: booking });
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update booking status (business owner)',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking status updated',
    type: BookingResponseDto,
  })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.bookingService.updateStatusByOwner(user.id, bookingId, dto);

    return successResponse({ data: booking });
  }
}
