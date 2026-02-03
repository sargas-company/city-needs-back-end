// src/modules/analytics/analytics.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsActionType, AnalyticsSource, BusinessStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';

import { AnalyticsActivityResponseDto } from './dto/analytics-activity-response.dto';
import { AnalyticsProfileViewsResponseDto } from './dto/analytics-profile-views-response.dto';
import { AnalyticsSummaryResponseDto } from './dto/analytics-summary-response.dto';
import { AnalyticsUserActionsResponseDto } from './dto/analytics-user-actions-response.dto';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(viewerUserId: string, dto: CreateAnalyticsEventDto): Promise<void> {
    const { businessId: targetBusinessId, type, source, actionType } = dto;

    // Verify target business exists and has ACTIVE status
    const targetBusiness = await this.prisma.business.findUnique({
      where: { id: targetBusinessId },
      select: { id: true, status: true },
    });

    if (!targetBusiness || targetBusiness.status !== BusinessStatus.ACTIVE) {
      throw new NotFoundException('Business not found');
    }

    // Log analytics event: viewer interacts with target business
    await this.prisma.analyticsEvent.create({
      data: {
        businessId: targetBusinessId,
        viewerUserId,
        type,
        source,
        actionType: actionType ?? null,
      },
    });
  }

  async getSummary(ownerUserId: string): Promise<AnalyticsSummaryResponseDto> {
    const business = await this.getOwnerBusiness(ownerUserId);

    // Get current and previous month date ranges
    const now = DateTime.utc();
    const currentMonthStart = now.startOf('month');
    const currentMonthEnd = now.endOf('month');
    const previousMonthStart = currentMonthStart.minus({ months: 1 });
    const previousMonthEnd = currentMonthStart.minus({ days: 1 }).endOf('day');

    // Count all metrics in one SQL query
    const [totalsResult] = await this.prisma.$queryRaw<
      Array<{
        current_profile_views: bigint;
        previous_profile_views: bigint;
        current_user_actions: bigint;
        previous_user_actions: bigint;
      }>
    >`
      SELECT
        COUNT(CASE WHEN type = 'PROFILE_VIEW' AND "createdAt" >= ${currentMonthStart.toJSDate()} AND "createdAt" <= ${currentMonthEnd.toJSDate()} THEN 1 END) as current_profile_views,
        COUNT(CASE WHEN type = 'PROFILE_VIEW' AND "createdAt" >= ${previousMonthStart.toJSDate()} AND "createdAt" <= ${previousMonthEnd.toJSDate()} THEN 1 END) as previous_profile_views,
        COUNT(CASE WHEN type = 'USER_ACTION' AND "createdAt" >= ${currentMonthStart.toJSDate()} AND "createdAt" <= ${currentMonthEnd.toJSDate()} THEN 1 END) as current_user_actions,
        COUNT(CASE WHEN type = 'USER_ACTION' AND "createdAt" >= ${previousMonthStart.toJSDate()} AND "createdAt" <= ${previousMonthEnd.toJSDate()} THEN 1 END) as previous_user_actions
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND "createdAt" >= ${previousMonthStart.toJSDate()}
        AND "createdAt" <= ${currentMonthEnd.toJSDate()}
    `;

    const currentProfileViews = Number(totalsResult.current_profile_views);
    const previousProfileViews = Number(totalsResult.previous_profile_views);
    const currentUserActions = Number(totalsResult.current_user_actions);
    const previousUserActions = Number(totalsResult.previous_user_actions);

    // Calculate delta percentages
    const profileViewsDelta = this.calculateDeltaPercent(currentProfileViews, previousProfileViews);
    const userActionsDelta = this.calculateDeltaPercent(currentUserActions, previousUserActions);

    return {
      profileViews: {
        total: currentProfileViews,
        deltaPercent: profileViewsDelta,
      },
      userActions: {
        total: currentUserActions,
        deltaPercent: userActionsDelta,
      },
    };
  }

  async getActivity(ownerUserId: string): Promise<AnalyticsActivityResponseDto> {
    const business = await this.getOwnerBusiness(ownerUserId);

    // Get last 6 months including current
    const now = DateTime.utc();
    const months: DateTime[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(now.minus({ months: i }).startOf('month'));
    }

    const firstMonthStart = months[0].toJSDate();
    const lastMonthEnd = months[months.length - 1].endOf('month').toJSDate();

    // Aggregate by month in PostgreSQL
    const results = await this.prisma.$queryRaw<
      Array<{ month: Date; views: bigint; actions: bigint }>
    >`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(CASE WHEN type = 'PROFILE_VIEW' THEN 1 END) as views,
        COUNT(CASE WHEN type = 'USER_ACTION' THEN 1 END) as actions
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND "createdAt" >= ${firstMonthStart}
        AND "createdAt" <= ${lastMonthEnd}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Create a map of results for quick lookup
    const resultsMap = new Map<string, { views: number; actions: number }>();
    results.forEach((row) => {
      const monthKey = DateTime.fromJSDate(row.month, { zone: 'utc' }).toFormat('yyyy-MM');
      resultsMap.set(monthKey, {
        views: Number(row.views),
        actions: Number(row.actions),
      });
    });

    // Map months to data, filling in zeros for months without data
    const data = months.map((month) => {
      const monthKey = month.toFormat('yyyy-MM');
      const monthData = resultsMap.get(monthKey) || { views: 0, actions: 0 };

      return {
        label: month.toFormat('MMM'),
        views: monthData.views,
        actions: monthData.actions,
      };
    });

    return { data };
  }

  async getProfileViews(ownerUserId: string): Promise<AnalyticsProfileViewsResponseDto> {
    const business = await this.getOwnerBusiness(ownerUserId);

    const now = DateTime.utc();
    const currentMonthStart = now.startOf('month');
    const currentMonthEnd = now.endOf('month');
    const previousMonthStart = currentMonthStart.minus({ months: 1 });
    const previousMonthEnd = currentMonthStart.minus({ days: 1 }).endOf('day');

    // Count current and previous month profile views in one SQL query
    const [totalsResult] = await this.prisma.$queryRaw<
      Array<{ current_total: bigint; previous_total: bigint }>
    >`
      SELECT
        COUNT(CASE WHEN "createdAt" >= ${currentMonthStart.toJSDate()} AND "createdAt" <= ${currentMonthEnd.toJSDate()} THEN 1 END) as current_total,
        COUNT(CASE WHEN "createdAt" >= ${previousMonthStart.toJSDate()} AND "createdAt" <= ${previousMonthEnd.toJSDate()} THEN 1 END) as previous_total
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND type = 'PROFILE_VIEW'
        AND "createdAt" >= ${previousMonthStart.toJSDate()}
        AND "createdAt" <= ${currentMonthEnd.toJSDate()}
    `;

    const currentTotal = Number(totalsResult.current_total);
    const previousTotal = Number(totalsResult.previous_total);

    // Calculate delta
    const deltaPercent = this.calculateDeltaPercent(currentTotal, previousTotal);

    // Get timeline for last 6 months using SQL aggregation
    const months: DateTime[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(now.minus({ months: i }).startOf('month'));
    }

    const firstMonthStart = months[0].toJSDate();
    const lastMonthEnd = months[months.length - 1].endOf('month').toJSDate();

    const timelineResults = await this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND type = 'PROFILE_VIEW'
        AND "createdAt" >= ${firstMonthStart}
        AND "createdAt" <= ${lastMonthEnd}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Create a map for quick lookup
    const timelineMap = new Map<string, number>();
    timelineResults.forEach((row) => {
      const monthKey = DateTime.fromJSDate(row.month, { zone: 'utc' }).toFormat('yyyy-MM');
      timelineMap.set(monthKey, Number(row.count));
    });

    // Map months to timeline data
    const timeline = months.map((month) => {
      const monthKey = month.toFormat('yyyy-MM');
      const count = timelineMap.get(monthKey) || 0;

      return {
        label: month.toFormat('MMM'),
        value: count,
      };
    });

    // Get source distribution for current month using SQL aggregation
    const sourceResults = await this.prisma.$queryRaw<Array<{ source: string; count: bigint }>>`
      SELECT
        source,
        COUNT(*) as count
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND type = 'PROFILE_VIEW'
        AND "createdAt" >= ${currentMonthStart.toJSDate()}
        AND "createdAt" <= ${currentMonthEnd.toJSDate()}
      GROUP BY source
      ORDER BY count DESC
    `;

    // Calculate percentages
    const sources = sourceResults.map((row) => {
      const count = Number(row.count);
      return {
        source: row.source as AnalyticsSource,
        percent: currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0,
      };
    });

    return {
      total: currentTotal,
      deltaPercent,
      timeline,
      sources,
    };
  }

  async getUserActions(ownerUserId: string): Promise<AnalyticsUserActionsResponseDto> {
    const business = await this.getOwnerBusiness(ownerUserId);

    const now = DateTime.utc();
    const currentMonthStart = now.startOf('month');
    const currentMonthEnd = now.endOf('month');
    const previousMonthStart = currentMonthStart.minus({ months: 1 });
    const previousMonthEnd = currentMonthStart.minus({ days: 1 }).endOf('day');

    // Count current and previous month user actions in one SQL query
    const [totalsResult] = await this.prisma.$queryRaw<
      Array<{ current_total: bigint; previous_total: bigint }>
    >`
      SELECT
        COUNT(CASE WHEN "createdAt" >= ${currentMonthStart.toJSDate()} AND "createdAt" <= ${currentMonthEnd.toJSDate()} THEN 1 END) as current_total,
        COUNT(CASE WHEN "createdAt" >= ${previousMonthStart.toJSDate()} AND "createdAt" <= ${previousMonthEnd.toJSDate()} THEN 1 END) as previous_total
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND type = 'USER_ACTION'
        AND "createdAt" >= ${previousMonthStart.toJSDate()}
        AND "createdAt" <= ${currentMonthEnd.toJSDate()}
    `;

    const currentTotal = Number(totalsResult.current_total);
    const previousTotal = Number(totalsResult.previous_total);

    // Calculate delta
    const deltaPercent = this.calculateDeltaPercent(currentTotal, previousTotal);

    // Get timeline for last 6 months using SQL aggregation
    const months: DateTime[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(now.minus({ months: i }).startOf('month'));
    }

    const firstMonthStart = months[0].toJSDate();
    const lastMonthEnd = months[months.length - 1].endOf('month').toJSDate();

    const timelineResults = await this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND type = 'USER_ACTION'
        AND "createdAt" >= ${firstMonthStart}
        AND "createdAt" <= ${lastMonthEnd}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Create a map for quick lookup
    const timelineMap = new Map<string, number>();
    timelineResults.forEach((row) => {
      const monthKey = DateTime.fromJSDate(row.month, { zone: 'utc' }).toFormat('yyyy-MM');
      timelineMap.set(monthKey, Number(row.count));
    });

    // Map months to timeline data
    const timeline = months.map((month) => {
      const monthKey = month.toFormat('yyyy-MM');
      const count = timelineMap.get(monthKey) || 0;

      return {
        label: month.toFormat('MMM'),
        value: count,
      };
    });

    // Get action type distribution for current month using SQL aggregation
    const actionResults = await this.prisma.$queryRaw<
      Array<{ actionType: string | null; count: bigint }>
    >`
      SELECT
        "actionType",
        COUNT(*) as count
      FROM analytics_events
      WHERE "businessId" = ${business.id}
        AND type = 'USER_ACTION'
        AND "createdAt" >= ${currentMonthStart.toJSDate()}
        AND "createdAt" <= ${currentMonthEnd.toJSDate()}
        AND "actionType" IS NOT NULL
      GROUP BY "actionType"
      ORDER BY count DESC
    `;

    // Create a map for quick lookup
    const actionCountsMap = new Map<string, number>();
    actionResults.forEach((row) => {
      if (row.actionType) {
        actionCountsMap.set(row.actionType, Number(row.count));
      }
    });

    // Calculate percentages for all action types
    const interactions = [
      AnalyticsActionType.CALL,
      AnalyticsActionType.MESSAGE,
      AnalyticsActionType.BOOKING,
    ].map((type) => {
      const count = actionCountsMap.get(type) || 0;
      return {
        type,
        percent: currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0,
      };
    });

    return {
      total: currentTotal,
      deltaPercent,
      timeline,
      interactions,
    };
  }

  private async getOwnerBusiness(ownerUserId: string): Promise<{ id: string }> {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId },
      select: { id: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  private calculateDeltaPercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Math.round((((current - previous) / previous) * 100 + Number.EPSILON) * 100) / 100;
  }
}
