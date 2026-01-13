import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, BusinessStatus, UserRole } from '@prisma/client';
import { DateTime } from 'luxon';
import { bookingConfig } from 'src/common/config/booking.config';
import {
  assertInsideWorkInterval,
  getBusinessWorkInterval,
  parseLocalDateTime,
} from 'src/common/utils/business-time.util';
import { PrismaService } from 'src/prisma/prisma.service';

import { BookingResponseDto } from './dto/booking-response.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

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

  async cancelBooking(
    bookingId: string,
    actor: { userId: string; role: UserRole },
    dto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    const cancelBeforeMinutes = Number(process.env.BOOKING_CANCEL_MINUTES_BEFORE_START) || 60;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    const nowUtc = DateTime.utc();
    const startUtc = DateTime.fromJSDate(booking.startAt, { zone: 'utc' });

    if (nowUtc >= startUtc) {
      throw new BadRequestException('Booking has already started');
    }

    const cancelDeadline = startUtc.minus({ minutes: cancelBeforeMinutes });
    if (nowUtc >= cancelDeadline) {
      throw new BadRequestException(
        `Booking can be cancelled only ${cancelBeforeMinutes} minutes before start`,
      );
    }

    const isUserOwner = booking.userId === actor.userId;
    const isBusinessOwner =
      actor.role === 'BUSINESS_OWNER' && booking.business.ownerUserId === actor.userId;

    if (!isUserOwner && !isBusinessOwner) {
      throw new BadRequestException('You cannot cancel this booking');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: actor.role,
        cancelReason: dto.reason ?? null,
      },
    });

    return {
      id: updated.id,
      businessId: updated.businessId,
      userId: updated.userId,
      status: updated.status,
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
      totalDurationMinutes: Math.round(
        (updated.endAt.getTime() - updated.startAt.getTime()) / 60000,
      ),
      serviceIds: [],
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async updateStatusByOwner(
    ownerUserId: string,
    bookingId: string,
    dto: UpdateBookingStatusDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: true,
        services: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.business.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('You do not own this business');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cancelled booking cannot be updated');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Completed booking cannot be updated');
    }

    if (booking.status === BookingStatus.PENDING && dto.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot complete booking without confirmation');
    }

    if (booking.status === BookingStatus.CONFIRMED && dto.status === BookingStatus.PENDING) {
      throw new BadRequestException('Cannot revert booking status');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: dto.status,
      },
    });

    const totalDurationMinutes = booking.services.reduce((sum, s) => sum + s.duration, 0);

    return {
      id: updated.id,
      businessId: updated.businessId,
      userId: updated.userId,
      status: updated.status,
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
      totalDurationMinutes,
      serviceIds: booking.services.map((s) => s.serviceId),
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
