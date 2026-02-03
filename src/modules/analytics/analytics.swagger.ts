// src/modules/analytics/analytics.swagger.ts
import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AnalyticsActivityResponseDto } from './dto/analytics-activity-response.dto';
import { AnalyticsProfileViewsResponseDto } from './dto/analytics-profile-views-response.dto';
import { AnalyticsSummaryResponseDto } from './dto/analytics-summary-response.dto';
import { AnalyticsUserActionsResponseDto } from './dto/analytics-user-actions-response.dto';

export function SwaggerAnalyticsCreateEvent() {
  return applyDecorators(
    ApiTags('Analytics'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Log analytics event' }),
    ApiResponse({
      status: 201,
      description: 'Event logged successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
        },
      },
    }),
  );
}

export function SwaggerAnalyticsGetSummary() {
  return applyDecorators(
    ApiTags('Analytics'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get analytics summary for current month' }),
    ApiResponse({
      status: 200,
      description: 'Analytics summary retrieved successfully',
      type: AnalyticsSummaryResponseDto,
    }),
  );
}

export function SwaggerAnalyticsGetActivity() {
  return applyDecorators(
    ApiTags('Analytics'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get analytics activity for last 6 months' }),
    ApiResponse({
      status: 200,
      description: 'Analytics activity retrieved successfully',
      type: AnalyticsActivityResponseDto,
    }),
  );
}

export function SwaggerAnalyticsGetProfileViews() {
  return applyDecorators(
    ApiTags('Analytics'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get detailed profile views analytics' }),
    ApiResponse({
      status: 200,
      description: 'Profile views analytics retrieved successfully',
      type: AnalyticsProfileViewsResponseDto,
    }),
  );
}

export function SwaggerAnalyticsGetUserActions() {
  return applyDecorators(
    ApiTags('Analytics'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get detailed user actions analytics' }),
    ApiResponse({
      status: 200,
      description: 'User actions analytics retrieved successfully',
      type: AnalyticsUserActionsResponseDto,
    }),
  );
}
