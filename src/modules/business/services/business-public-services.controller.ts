import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination.dto';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { BusinessServicesService } from './business-services.service';

@ApiTags('Business Services (Public)')
@ApiBearerAuth()
@UseGuards(DbUserAuthGuard)
@Controller('business/:businessId/services')
export class BusinessPublicServicesController {
  constructor(private readonly servicesService: BusinessServicesService) {}

  @Get()
  async list(@Param('businessId') businessId: string, @Query() query: CursorPaginationQueryDto) {
    const result = await this.servicesService.listPublicServices(businessId, query);
    return successResponse(result);
  }
}
