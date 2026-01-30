// src/modules/reels/public/reels-public.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';

import { GetReelsQueryDto } from './dto/get-reels-query.dto';
import { ReelsPublicService } from './reels-public.service';
import { SwaggerPublicReels } from './reels-public.swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DbUserAuthGuard } from '../../../common/guards/db-user-auth.guard';
import { successResponse } from '../../../common/utils/response.util';

@ApiTags('Reels')
@ApiBearerAuth()
@Controller('/reels')
@UseGuards(DbUserAuthGuard)
export class ReelsPublicController {
  constructor(private readonly reelsPublicService: ReelsPublicService) {}

  @Get()
  @SwaggerPublicReels()
  async getReels(@CurrentUser() _user: User, @Query() query: GetReelsQueryDto) {
    const result = await this.reelsPublicService.getReels(query);
    return successResponse(result);
  }
}
