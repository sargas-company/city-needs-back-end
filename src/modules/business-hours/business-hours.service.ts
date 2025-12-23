import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessHour, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { BusinessHourDto, BusinessHoursDayDto } from './dto/business-hours.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';

@Injectable()
export class BusinessHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async setBusinessHours(
    businessId: string,
    items: UpdateBusinessHoursDto[],
  ): Promise<BusinessHoursDayDto[]> {
    return this.prisma.$transaction((tx) => this.setBusinessHoursTx(tx, businessId, items));
  }

  async setBusinessHoursTx(
    tx: Prisma.TransactionClient,
    businessId: string,
    items: UpdateBusinessHoursDto[],
  ): Promise<BusinessHoursDayDto[]> {
    await this.ensureBusinessExists(tx, businessId);

    const data = items.map((item) => this.toCreateInput(businessId, item));

    await tx.businessHour.deleteMany({ where: { businessId } });
    if (data.length > 0) {
      await tx.businessHour.createMany({ data });
    }

    const hours = await tx.businessHour.findMany({
      where: { businessId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });

    return this.groupByWeekday(hours);
  }

  async getBusinessHours(businessId: string): Promise<BusinessHoursDayDto[]> {
    await this.ensureBusinessExists(this.prisma, businessId);

    const hours = await this.prisma.businessHour.findMany({
      where: { businessId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });

    return this.groupByWeekday(hours);
  }

  private async ensureBusinessExists(client: Prisma.TransactionClient, businessId: string) {
    const business = await client.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');
  }

  private toCreateInput(businessId: string, item: UpdateBusinessHoursDto) {
    const isClosed = item.isClosed ?? false;
    const is24h = item.is24h ?? false;
    const hasStart = item.startTime !== undefined && item.startTime !== null;
    const hasEnd = item.endTime !== undefined && item.endTime !== null;

    if (isClosed && is24h) {
      throw new BadRequestException('isClosed and is24h cannot be true at the same time');
    }

    if (isClosed || is24h) {
      if (hasStart || hasEnd) {
        throw new BadRequestException('startTime and endTime must be null for closed/24h days');
      }
      return {
        businessId,
        weekday: item.weekday,
        startTime: null,
        endTime: null,
        isClosed,
        is24h,
      };
    }

    if (!hasStart || !hasEnd) {
      throw new BadRequestException('startTime and endTime are required unless day is closed/24h');
    }

    return {
      businessId,
      weekday: item.weekday,
      startTime: this.toUtcTime(item.startTime),
      endTime: this.toUtcTime(item.endTime),
      isClosed: false,
      is24h: false,
    };
  }

  private toUtcTime(value: string | null | undefined): Date | null {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  }

  private groupByWeekday(hours: BusinessHour[]): BusinessHoursDayDto[] {
    const grouped = new Map<number, BusinessHourDto[]>();

    for (const hour of hours) {
      const list = grouped.get(hour.weekday) ?? [];
      list.push(this.toDto(hour));
      grouped.set(hour.weekday, list);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weekday, list]) => ({ weekday, hours: list }));
  }

  private toDto(hour: BusinessHour): BusinessHourDto {
    return {
      id: hour.id,
      businessId: hour.businessId,
      weekday: hour.weekday,
      startTime: this.formatTime(hour.startTime),
      endTime: this.formatTime(hour.endTime),
      isClosed: hour.isClosed,
      is24h: hour.is24h,
    };
  }

  private formatTime(value: Date | null): string | null {
    if (!value) return null;
    return value.toISOString().slice(11, 16);
  }
}
