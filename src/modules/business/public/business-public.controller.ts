import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
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
  async getBusinesses(@CurrentUser() user: User, @Query() query: GetBusinessesQueryDto) {
    const result = await this.businessPublicService.getBusinesses(query, user.id);
    return successResponse(result);
  }
}
