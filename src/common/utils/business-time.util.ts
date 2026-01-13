// src/common/utils/business-time.util.ts
import { BadRequestException } from '@nestjs/common';
import { BusinessHour } from '@prisma/client';
import { DateTime } from 'luxon';

export type BusinessWorkInterval = {
  workStart: DateTime;
  workEnd: DateTime;
};

export function parseLocalDate(date: string, timeZone: string): DateTime {
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

export function parseLocalDateTime(dateTime: string, timeZone: string): DateTime {
  const parsed = DateTime.fromISO(dateTime, { zone: timeZone });

  if (!parsed.isValid) {
    throw new BadRequestException('Invalid local datetime');
  }

  return parsed;
}

export function getBusinessWorkInterval(
  day: DateTime,
  businessHour: BusinessHour,
): BusinessWorkInterval {
  if (businessHour.isClosed) {
    throw new BadRequestException('Business is closed on this day');
  }

  if (businessHour.is24h) {
    return {
      workStart: day.startOf('day'),
      workEnd: day.endOf('day'),
    };
  }

  if (!businessHour.startTime || !businessHour.endTime) {
    throw new BadRequestException('Invalid business hours configuration');
  }

  const startTime = DateTime.fromJSDate(businessHour.startTime, { zone: 'utc' });
  const endTime = DateTime.fromJSDate(businessHour.endTime, { zone: 'utc' });

  return {
    workStart: day.set({
      hour: startTime.hour,
      minute: startTime.minute,
    }),
    workEnd: day.set({
      hour: endTime.hour,
      minute: endTime.minute,
    }),
  };
}

export function assertInsideWorkInterval(
  start: DateTime,
  end: DateTime,
  interval: BusinessWorkInterval,
) {
  if (start < interval.workStart || end > interval.workEnd) {
    throw new BadRequestException('Selected time is outside business hours');
  }
}
