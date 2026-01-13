import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookingStatus, BusinessStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { bookingConfig } from 'src/common/config/booking.config';
import {
  assertInsideWorkInterval,
  getBusinessWorkInterval,
  parseLocalDateTime,
} from 'src/common/utils/business-time.util';
import { PrismaService } from 'src/prisma/prisma.service';

import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBooking(userId: string, dto: CreateBookingDto): Promise<BookingResponseDto> {
    const { businessId, serviceIds, startAt } = dto;

    if (!serviceIds?.length) {
      throw new BadRequestException('serviceIds must not be empty');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { businessHours: true },
    });

    if (!business) throw new NotFoundException('Business not found');
    if (business.status !== BusinessStatus.ACTIVE) {
      throw new BadRequestException('Business is not active');
    }

    const timeZone = business.timeZone;
    const startLocal = parseLocalDateTime(startAt, timeZone);

    const services = await this.prisma.businessService.findMany({
      where: { id: { in: serviceIds }, businessId, status: 'ACTIVE' },
      orderBy: { position: 'asc' },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Some services are missing or inactive');
    }

    const totalDurationMinutes = services.reduce((s, x) => s + x.duration, 0);
    const endLocal = startLocal.plus({ minutes: totalDurationMinutes });

    const weekday = startLocal.weekday - 1;
    const businessHour = business.businessHours.find((h) => h.weekday === weekday);

    if (!businessHour) {
      throw new BadRequestException('Business is closed on this day');
    }

    const interval = getBusinessWorkInterval(startLocal, businessHour);
    assertInsideWorkInterval(startLocal, endLocal, interval);

    const nowLocal = DateTime.now().setZone(timeZone);
    if (startLocal <= nowLocal.plus({ minutes: bookingConfig.bufferMinutes })) {
      throw new BadRequestException('Selected time is in the past');
    }

    const startUtc = startLocal.toUTC();
    const endUtc = endLocal.toUTC();
    const startUtcMinusBuffer = startLocal.minus({ minutes: bookingConfig.bufferMinutes }).toUTC();

    const booking = await this.prisma.$transaction(async (tx) => {
      const conflicts = await tx.$queryRawUnsafe<{ id: string }[]>(
        `
        SELECT id
        FROM bookings
        WHERE "businessId" = $1
          AND status = 'CONFIRMED'
          AND "startAt" < $2
          AND "endAt" > $3
        FOR UPDATE
        `,
        businessId,
        endUtc.toJSDate(),
        startUtcMinusBuffer.toJSDate(),
      );

      if (conflicts.length > 0) {
        throw new BadRequestException('Time slot is no longer available');
      }

      const created = await tx.booking.create({
        data: {
          businessId,
          userId,
          startAt: startUtc.toJSDate(),
          endAt: endUtc.toJSDate(),
          status: BookingStatus.PENDING,
        },
      });

      for (const s of services) {
        await tx.bookingService.create({
          data: {
            bookingId: created.id,
            serviceId: s.id,
            name: s.name,
            price: s.price,
            duration: s.duration,
          },
        });
      }

      return created;
    });

    return {
      id: booking.id,
      businessId: booking.businessId,
      userId: booking.userId,
      status: booking.status,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      totalDurationMinutes,
      serviceIds,
      createdAt: booking.createdAt.toISOString(),
    };
  }
}
