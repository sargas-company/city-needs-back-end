import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { BusinessPublicService } from './business-public.service';
import { BusinessPublicGetBusinessesSwagger } from './business-public.swagger';
import { GetBusinessesQueryDto } from './dto/get-businesses-query.dto';

@ApiTags('Businesses')
@ApiBearerAuth()
@UseGuards(DbUserAuthGuard)
@Controller('businesses')
export class BusinessPublicController {
  constructor(private readonly businessPublicService: BusinessPublicService) {}

  @Get()
  @BusinessPublicGetBusinessesSwagger()
  async getBusinesses(@Query() query: GetBusinessesQueryDto) {
    const result = await this.businessPublicService.getBusinesses(query);
    return successResponse(result);
  }
}
