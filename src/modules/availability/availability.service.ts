import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookingStatus, BusinessStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { bookingConfig } from 'src/common/config/booking.config';
import { getBusinessWorkInterval, parseLocalDate } from 'src/common/utils/business-time.util';
import { PrismaService } from 'src/prisma/prisma.service';

import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { AvailabilitySlotDto } from './dto/availability-slot.dto';

const SLOT_STEP_MINUTES = bookingConfig.slotStepMinutes;
const BUFFER_MINUTES = bookingConfig.bufferMinutes;

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  private roundUpToStep(dt: DateTime): DateTime {
    const remainder = dt.minute % SLOT_STEP_MINUTES;
    return remainder === 0
      ? dt.startOf('minute')
      : dt.plus({ minutes: SLOT_STEP_MINUTES - remainder }).startOf('minute');
  }

  private toLocalIso(dt: DateTime): string {
    return dt.toFormat("yyyy-MM-dd'T'HH:mm");
  }

  async getAvailability(params: {
    businessId: string;
    date: string;
    serviceIds: string[];
  }): Promise<AvailabilityResponseDto> {
    const { businessId, date, serviceIds } = params;

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

    const services = await this.prisma.businessService.findMany({
      where: { id: { in: serviceIds }, businessId, status: 'ACTIVE' },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Some services are missing or inactive');
    }

    const totalDurationMinutes = services.reduce((s, x) => s + x.duration, 0);

    const day = parseLocalDate(date, timeZone);
    const now = DateTime.now().setZone(timeZone);

    const weekday = day.weekday - 1;
    const businessHour = business.businessHours.find((h) => h.weekday === weekday);

    if (!businessHour || businessHour.isClosed) {
      return this.emptyResponse(businessId, date, timeZone, totalDurationMinutes);
    }

    const { workStart, workEnd } = getBusinessWorkInterval(day, businessHour);

    if (workEnd <= now) {
      return this.emptyResponse(businessId, date, timeZone, totalDurationMinutes);
    }

    let effectiveStart = workStart;
    if (day.hasSame(now, 'day')) {
      effectiveStart = this.roundUpToStep(
        DateTime.max(workStart, now.plus({ minutes: BUFFER_MINUTES })),
      );
    }

    const latestStart = workEnd.minus({ minutes: totalDurationMinutes });
    if (effectiveStart > latestStart) {
      return this.emptyResponse(businessId, date, timeZone, totalDurationMinutes);
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        businessId,
        status: BookingStatus.CONFIRMED,
        startAt: { lt: workEnd.toUTC().toJSDate() },
        endAt: { gt: effectiveStart.toUTC().toJSDate() },
      },
    });

    const busy = bookings.map((b) => ({
      start: DateTime.fromJSDate(b.startAt).setZone(timeZone),
      end: DateTime.fromJSDate(b.endAt).setZone(timeZone).plus({ minutes: BUFFER_MINUTES }),
    }));

    const slots: AvailabilitySlotDto[] = [];
    let cursor = effectiveStart;

    while (cursor <= latestStart) {
      const end = cursor.plus({ minutes: totalDurationMinutes });
      const effectiveEnd = end.plus({ minutes: BUFFER_MINUTES });

      const overlaps = busy.some((b) => cursor < b.end && effectiveEnd > b.start);

      if (!overlaps) {
        slots.push({
          startAt: this.toLocalIso(cursor),
          endAt: this.toLocalIso(end),
        });
      }

      cursor = cursor.plus({ minutes: SLOT_STEP_MINUTES });
    }

    return {
      businessId,
      date,
      timeZone,
      slotStepMinutes: SLOT_STEP_MINUTES,
      bufferMinutes: BUFFER_MINUTES,
      totalDurationMinutes,
      slots,
    };
  }

  private emptyResponse(
    businessId: string,
    date: string,
    timeZone: string,
    totalDurationMinutes: number,
  ): AvailabilityResponseDto {
    return {
      businessId,
      date,
      timeZone,
      slotStepMinutes: SLOT_STEP_MINUTES,
      bufferMinutes: BUFFER_MINUTES,
      totalDurationMinutes,
      slots: [],
    };
  }
}
