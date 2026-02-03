// src/modules/analytics/analytics.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { successResponse } from 'src/common/utils/response.util';

import { AnalyticsService } from './analytics.service';
import {
  SwaggerAnalyticsCreateEvent,
  SwaggerAnalyticsGetActivity,
  SwaggerAnalyticsGetProfileViews,
  SwaggerAnalyticsGetSummary,
  SwaggerAnalyticsGetUserActions,
} from './analytics.swagger';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

@UseGuards(DbUserAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  @Roles(UserRole.END_USER)
  @SwaggerAnalyticsCreateEvent()
  async createEvent(@CurrentUser() user: User, @Body() dto: CreateAnalyticsEventDto) {
    await this.analyticsService.createEvent(user.id, dto);

    return successResponse({ success: true }, 201);
  }

  @Get('summary')
  @Roles(UserRole.BUSINESS_OWNER)
  @SwaggerAnalyticsGetSummary()
  async getSummary(@CurrentUser() user: User) {
    const summary = await this.analyticsService.getSummary(user.id);

    return successResponse(summary);
  }

  @Get('activity')
  @Roles(UserRole.BUSINESS_OWNER)
  @SwaggerAnalyticsGetActivity()
  async getActivity(@CurrentUser() user: User) {
    const activity = await this.analyticsService.getActivity(user.id);

    return successResponse(activity);
  }

  @Get('profile-views')
  @Roles(UserRole.BUSINESS_OWNER)
  @SwaggerAnalyticsGetProfileViews()
  async getProfileViews(@CurrentUser() user: User) {
    const profileViews = await this.analyticsService.getProfileViews(user.id);

    return successResponse(profileViews);
  }

  @Get('user-actions')
  @Roles(UserRole.BUSINESS_OWNER)
  @SwaggerAnalyticsGetUserActions()
  async getUserActions(@CurrentUser() user: User) {
    const userActions = await this.analyticsService.getUserActions(user.id);

    return successResponse(userActions);
  }
}
