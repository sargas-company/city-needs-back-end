import { Controller, Post, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination.dto';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { SavedBusinessesService } from './saved-businesses.service';
import {
  SwaggerAddSavedBusiness,
  SwaggerRemoveSavedBusiness,
  SwaggerListSavedBusinesses,
} from './saved-businesses.swagger';

@ApiTags('Saved Businesses')
@ApiBearerAuth()
@UseGuards(DbUserAuthGuard)
@Controller('saved-businesses')
export class SavedBusinessesController {
  constructor(private readonly savedBusinessesService: SavedBusinessesService) {}

  @Post(':businessId')
  @SwaggerAddSavedBusiness()
  async add(@CurrentUser() user: User, @Param('businessId') businessId: string) {
    await this.savedBusinessesService.add(user.id, businessId);

    return successResponse({
      data: null,
      message: 'Business added to saved',
    });
  }

  @Delete(':businessId')
  @SwaggerRemoveSavedBusiness()
  async remove(@CurrentUser() user: User, @Param('businessId') businessId: string) {
    await this.savedBusinessesService.remove(user.id, businessId);

    return successResponse({
      data: null,
      message: 'Business removed from saved',
    });
  }

  @Get()
  @SwaggerListSavedBusinesses()
  async list(@CurrentUser() user: User, @Query() query: CursorPaginationQueryDto) {
    const result = await this.savedBusinessesService.list(user.id, query);

    return successResponse(result);
  }
}
