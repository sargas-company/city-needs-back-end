import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination.dto';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { BusinessServicesService } from './business-services.service';
import { CreateBusinessServiceDto } from './dto/create-business-service.dto';
import { UpdateBusinessServiceDto } from './dto/update-business-service.dto';

@ApiTags('Business Services (Owner)')
@ApiBearerAuth()
@UseGuards(DbUserAuthGuard)
@Controller('business/me/services')
export class BusinessServicesController {
  constructor(private readonly servicesService: BusinessServicesService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateBusinessServiceDto) {
    const service = await this.servicesService.createService(user, dto);
    return successResponse({ data: service }, 201);
  }

  @Get()
  async list(@CurrentUser() user: User, @Query() query: CursorPaginationQueryDto) {
    const result = await this.servicesService.listServices(user, query);
    return successResponse(result);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessServiceDto,
  ) {
    const service = await this.servicesService.updateService(user, id, dto);
    return successResponse({ data: service });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.servicesService.deleteService(user, id);
    return successResponse({ data: null });
  }
}
