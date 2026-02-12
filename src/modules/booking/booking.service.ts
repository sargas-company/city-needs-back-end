import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, BusinessStatus, User, UserRole } from '@prisma/client';
import { DateTime } from 'luxon';
import { bookingConfig } from 'src/common/config/booking.config';
import {
  CursorPaginationQueryDto,
  CursorPaginationResponseDto,
} from 'src/common/dto/cursor-pagination.dto';
import {
  assertInsideWorkInterval,
  formatToBusinessLocal,
  getBusinessWorkInterval,
  parseLocalDate,
  parseLocalDateTime,
} from 'src/common/utils/business-time.util';
import { PrismaService } from 'src/prisma/prisma.service';

import { BookingResponseDto } from './dto/booking-response.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetBusinessBookingsQueryDto } from './dto/get-business-bookings-query.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBooking(user: User, dto: CreateBookingDto): Promise<BookingResponseDto> {
    const { businessId, serviceIds, startAt } = dto;

    if (!serviceIds?.length) {
      throw new BadRequestException('serviceIds must not be empty');
    }

    // Check user role - only end users can create bookings

    if (user.role !== UserRole.END_USER) {
      throw new ForbiddenException('Only end users can create bookings');
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
          userId: user.id,
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
      startAt: formatToBusinessLocal(booking.startAt, timeZone),
      endAt: formatToBusinessLocal(booking.endAt, timeZone),
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

  async getBusinessBookingsCursor(
    ownerUserId: string,
    query: GetBusinessBookingsQueryDto,
  ): Promise<CursorPaginationResponseDto<any>> {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId },
      select: { id: true, timeZone: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const limit = query.limit ?? 10;
    const where: any = {
      businessId: business.id,
    };

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Filter by date (local business time)
    if (query.date) {
      const localDate = parseLocalDate(query.date, business.timeZone);
      const dayStart = localDate.startOf('day');
      const dayEnd = localDate.endOf('day');

      where.startAt = {
        gte: dayStart.toUTC().toJSDate(),
        lte: dayEnd.toUTC().toJSDate(),
      };
    }

    const items = await this.prisma.booking.findMany({
      where,
      take: limit + 1,
      ...(query.cursor && {
        cursor: {
          id: query.cursor,
        },
        skip: 1,
      }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatar: {
              select: {
                id: true,
                url: true,
              },
            },
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
      },
    });

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    const totalCount = await this.prisma.booking.count({ where });

    return {
      data: data.map((b) => ({
        id: b.id,
        userId: b.userId,
        userName: b.user.username ?? undefined,
        userPhone: b.user.phone ?? undefined,
        userAvatar: b.user.avatar
          ? {
              id: b.user.avatar.id,
              url: b.user.avatar.url,
            }
          : null,
        status: b.status,
        startAt: formatToBusinessLocal(b.startAt, business.timeZone),
        endAt: formatToBusinessLocal(b.endAt, business.timeZone),
        createdAt: b.createdAt.toISOString(),
        services: b.services.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration,
        })),
        totalPrice: b.services.reduce((sum, s) => sum + s.price, 0),
      })),
      meta: {
        nextCursor,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage,
      },
    };
  }

  async getMyBookingsCursor(
    userId: string,
    query: CursorPaginationQueryDto,
    options?: { withoutReview?: boolean },
  ): Promise<CursorPaginationResponseDto<any>> {
    const limit = query.limit ?? 10;

    const where: any = {
      userId,
      ...(options?.withoutReview && {
        status: BookingStatus.COMPLETED,
        review: { is: null },
      }),
    };

    const items = await this.prisma.booking.findMany({
      where,
      take: limit + 1,
      ...(query.cursor && {
        cursor: {
          id: query.cursor,
        },
        skip: 1,
      }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        review: { select: { id: true } },
        business: {
          select: {
            id: true,
            name: true,
            timeZone: true,
            logo: {
              select: {
                id: true,
                url: true,
              },
            },
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
      },
    });

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    const totalCount = await this.prisma.booking.count({ where });

    return {
      data: data.map((b) => {
        const services = b.services.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration,
        }));

        const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

        return {
          id: b.id,
          businessId: b.businessId,
          businessName: b.business.name,
          businessLogo: b.business.logo
            ? {
                id: b.business.logo.id,
                url: b.business.logo.url,
              }
            : null,
          status: b.status,
          startAt: formatToBusinessLocal(b.startAt, b.business.timeZone),
          endAt: formatToBusinessLocal(b.endAt, b.business.timeZone),
          createdAt: b.createdAt.toISOString(),
          hasReview: Boolean(b.review),
          services,
          totalPrice,
        };
      }),
      meta: {
        nextCursor,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage,
      },
    };
  }
}
