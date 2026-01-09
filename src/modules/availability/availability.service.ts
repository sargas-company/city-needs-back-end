// src/modules/availability/availability.service.ts
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookingStatus, BusinessStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { bookingConfig } from 'src/common/config/booking.config';
import { PrismaService } from 'src/prisma/prisma.service';

import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { AvailabilitySlotDto } from './dto/availability-slot.dto';

const SLOT_STEP_MINUTES = bookingConfig.slotStepMinutes;
const BUFFER_MINUTES = bookingConfig.bufferMinutes;

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  private extractTimeParts(date: Date) {
    const iso = date.toISOString();
    const [, time] = iso.split('T');
    const [hour, minute] = time.split(':').map(Number);
    return { hour, minute };
  }

  private roundUpToStep(dt: DateTime): DateTime {
    const minutes = dt.minute;
    const remainder = minutes % SLOT_STEP_MINUTES;

    if (remainder === 0) return dt.startOf('minute');

    return dt.plus({ minutes: SLOT_STEP_MINUTES - remainder }).startOf('minute');
  }

  private parseAndValidateDate(date: string, timeZone: string): DateTime {
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    if (!DATE_REGEX.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    const parsed = DateTime.fromISO(date, { zone: timeZone });

    if (!parsed.isValid) {
      throw new BadRequestException('date is not a valid calendar date');
    }

    return parsed;
  }

  async getAvailability(params: {
    businessId: string;
    date: string;
    serviceIds: string[];
  }): Promise<AvailabilityResponseDto> {
    const { businessId, date, serviceIds } = params;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new BadRequestException('serviceIds must not be empty');
    }

    if (!businessId) {
      throw new BadRequestException('businessId must not be empty');
    }

    if (!date) {
      throw new BadRequestException('date must not be empty');
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
      where: {
        id: { in: serviceIds },
        businessId,
        status: 'ACTIVE',
      },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Some services are missing or inactive');
    }

    const totalDurationMinutes = services.reduce((sum, s) => sum + s.duration, 0);

    const parsedDate = this.parseAndValidateDate(date, timeZone);

    const dayStart = parsedDate.startOf('day');
    const dayEnd = dayStart.endOf('day');

    const weekday = dayStart.weekday - 1; // 0 = Monday

    const now = DateTime.now().setZone(timeZone);

    if (dayEnd <= now) {
      return this.emptyResponse(businessId, date, timeZone, totalDurationMinutes);
    }

    const businessHour = business.businessHours.find((h) => h.weekday === weekday);

    if (!businessHour || businessHour.isClosed) {
      return this.emptyResponse(businessId, date, timeZone, totalDurationMinutes);
    }

    let workStart: DateTime;
    let workEnd: DateTime;

    if (businessHour.is24h) {
      workStart = dayStart;
      workEnd = dayEnd;
    } else {
      const start = this.extractTimeParts(businessHour.startTime!);
      const end = this.extractTimeParts(businessHour.endTime!);

      workStart = dayStart.set({ hour: start.hour, minute: start.minute });
      workEnd = dayStart.set({ hour: end.hour, minute: end.minute });
    }

    if (workEnd <= now) {
      return this.emptyResponse(businessId, date, timeZone, totalDurationMinutes);
    }

    let effectiveWorkStart = workStart;

    if (dayStart.hasSame(now, 'day')) {
      effectiveWorkStart = DateTime.max(workStart, now.plus({ minutes: BUFFER_MINUTES }));

      effectiveWorkStart = this.roundUpToStep(effectiveWorkStart);
    }

    const latestStart = workEnd.minus({ minutes: totalDurationMinutes });

    if (effectiveWorkStart > latestStart) {
      return this.emptyResponse(businessId, date, timeZone, totalDurationMinutes);
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        businessId,
        status: BookingStatus.CONFIRMED,
        startAt: { lt: workEnd.toJSDate() },
        endAt: { gt: effectiveWorkStart.toJSDate() },
      },
    });

    const busyIntervals = bookings.map((b) => ({
      start: DateTime.fromJSDate(b.startAt).setZone(timeZone),
      end: DateTime.fromJSDate(b.endAt).setZone(timeZone).plus({ minutes: BUFFER_MINUTES }),
    }));

    const slots: AvailabilitySlotDto[] = [];
    let cursor = effectiveWorkStart;

    while (cursor <= latestStart) {
      const slotStart = cursor;
      const slotEnd = cursor.plus({ minutes: totalDurationMinutes });

      const overlaps = busyIntervals.some((busy) => slotStart < busy.end && slotEnd > busy.start);

      if (!overlaps) {
        slots.push({
          startAt: slotStart.toUTC().toISO()!,
          endAt: slotEnd.toUTC().toISO()!,
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
