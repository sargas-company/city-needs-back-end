import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { successResponse } from 'src/common/utils/response.util';

import { AdminService } from './admin.service';
import { SwaggerAdminGetBusinesses } from './admin.swagger';
import { GetAdminBusinessesQueryDto } from './dto/get-admin-businesses-query.dto';

@UseGuards(DbUserAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('businesses')
  @SwaggerAdminGetBusinesses()
  async getBusinesses(@Query() query: GetAdminBusinessesQueryDto) {
    const result = await this.adminService.getBusinesses(query);
    return successResponse(result);
  }
}
