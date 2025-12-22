import { Body, Controller, Get, Param, ParseArrayPipe, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { BusinessHoursService } from './business-hours.service';
import { BusinessHoursDayDto } from './dto/business-hours.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';

@ApiTags('BusinessHours')
@Controller('business')
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {}

  @Post(':id/hours')
  @ApiBody({ type: [UpdateBusinessHoursDto] })
  @ApiOkResponse({ type: BusinessHoursDayDto, isArray: true })
  async setBusinessHours(
    @Param('id') businessId: string,
    @Body(
      new ParseArrayPipe({
        items: UpdateBusinessHoursDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    items: UpdateBusinessHoursDto[],
  ): Promise<BusinessHoursDayDto[]> {
    return this.businessHoursService.setBusinessHours(businessId, items);
  }

  @Get(':id/hours')
  @ApiOkResponse({ type: BusinessHoursDayDto, isArray: true })
  async getBusinessHours(@Param('id') businessId: string): Promise<BusinessHoursDayDto[]> {
    return this.businessHoursService.getBusinessHours(businessId);
  }
}
