import { Controller, Get, Param, Post, Query, UseGuards, Body } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { successResponse } from 'src/common/utils/response.util';

import { AdminService } from './admin.service';
import {
  SwaggerAdminActivateBusiness,
  SwaggerAdminApproveVerification,
  SwaggerAdminDeactivateBusiness,
  SwaggerAdminGetBusinesses,
  SwaggerAdminGetVerification,
  SwaggerAdminGetVerifications,
  SwaggerAdminRejectVerification,
} from './admin.swagger';
import { AdminVerificationActionResponseDto } from './dto/admin-verification-action-response.dto';
import { GetAdminBusinessesQueryDto } from './dto/get-admin-businesses-query.dto';
import { GetAdminVerificationsQueryDto } from './dto/get-admin-verifications-query.dto';
import { RejectVerificationDto } from './dto/reject-verification.dto';

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

  @Get('verifications')
  @SwaggerAdminGetVerifications()
  async getVerifications(@Query() query: GetAdminVerificationsQueryDto) {
    const result = await this.adminService.getVerifications(query);
    return successResponse(result);
  }

  @Get('verifications/:id')
  @SwaggerAdminGetVerification()
  async getVerification(@Param('id') id: string) {
    const result = await this.adminService.getVerification(id);
    return successResponse(result);
  }

  @Post('businesses/:id/deactivate')
  @SwaggerAdminDeactivateBusiness()
  async deactivateBusiness(@Param('id') id: string) {
    const result = await this.adminService.deactivateBusiness(id);
    return successResponse(result);
  }

  @Post('businesses/:id/activate')
  @SwaggerAdminActivateBusiness()
  async activateBusiness(@Param('id') id: string) {
    const result = await this.adminService.activateBusiness(id);
    return successResponse(result);
  }

  @Post('verifications/:id/approve')
  @SwaggerAdminApproveVerification()
  async approveVerification(@Param('id') verificationId: string, @CurrentUser() user: User) {
    const result = await this.adminService.approveVerification(verificationId, user.id);
    return successResponse<AdminVerificationActionResponseDto>(result);
  }

  @Post('verifications/:id/reject')
  @SwaggerAdminRejectVerification()
  async rejectVerification(
    @Param('id') verificationId: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.adminService.rejectVerification(
      verificationId,
      dto.rejectionReason,
      user.id,
    );
    return successResponse<AdminVerificationActionResponseDto>(result);
  }
}
