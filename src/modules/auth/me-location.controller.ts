import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SkipBusinessVerification } from 'src/common/decorators/skip-business-verification.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';

import { MeLocationResponseDto } from './dto/location/me-location.dto';
import { UpdateMyLocationDto } from './dto/location/update-my-location.dto';
import { MeLocationService } from './me-location.service';

@ApiTags('auth')
@ApiBearerAuth()
@SkipBusinessVerification()
@UseGuards(DbUserAuthGuard)
@Controller('auth')
export class MeLocationController {
  constructor(private readonly meLocationService: MeLocationService) {}

  @Post('location')
  @ApiBody({ type: UpdateMyLocationDto })
  @ApiOkResponse({ type: MeLocationResponseDto })
  async upsertLocation(
    @CurrentUser() user: User,
    @Body() dto: UpdateMyLocationDto,
  ): Promise<MeLocationResponseDto> {
    const location = await this.meLocationService.upsertLocation(user.id, dto);
    return { ok: true, location };
  }

  @Get('location')
  @ApiOkResponse({ type: MeLocationResponseDto })
  async getLocation(@CurrentUser() user: User): Promise<MeLocationResponseDto> {
    const location = await this.meLocationService.getLocation(user.id);
    return { ok: true, location };
  }
}
