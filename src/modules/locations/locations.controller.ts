// src/modules/locations/locations.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';

import { AddressSearchQueryDto } from './dto/address-search-query.dto';
import { AddressSearchResponseDto } from './dto/address-search-response.dto';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@UseGuards(DbUserAuthGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('address-search')
  @ApiOperation({ summary: 'Search street and building by city' })
  @ApiResponse({ status: 200, type: AddressSearchResponseDto })
  async searchAddress(@Query() query: AddressSearchQueryDto): Promise<AddressSearchResponseDto> {
    return this.locationsService.searchAddress(query);
  }
}
