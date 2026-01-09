// src/modules/availability/availability.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';

import { AvailabilityService } from './availability.service';

@ApiTags('Availability')
@ApiBearerAuth()
@Controller('availability')
@UseGuards(DbUserAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @ApiOperation({
    summary: 'Get available booking slots for business and services',
  })
  @ApiQuery({
    name: 'businessId',
    type: String,
    required: true,
    description: 'Business ID',
  })
  @ApiQuery({
    name: 'date',
    type: String,
    required: true,
    example: '2026-01-15',
    description: 'Date in YYYY-MM-DD format (business timezone)',
  })
  @ApiQuery({
    name: 'serviceIds',
    type: [String],
    required: true,
    description: 'Array of business service IDs',
  })
  async getAvailability(
    @Query('businessId') businessId: string,
    @Query('date') date: string,
    @Query('serviceIds') serviceIds: string[] | string,
  ) {
    const normalizedServiceIds = (Array.isArray(serviceIds) ? serviceIds : [serviceIds]).filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    );

    return this.availabilityService.getAvailability({
      businessId,
      date,
      serviceIds: normalizedServiceIds,
    });
  }
}
