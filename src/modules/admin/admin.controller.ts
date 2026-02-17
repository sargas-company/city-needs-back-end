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
  SwaggerAdminApproveBusinessVideo,
  SwaggerAdminApproveVerification,
  SwaggerAdminDeactivateBusiness,
  SwaggerAdminGetBusiness,
  SwaggerAdminGetBusinesses,
  SwaggerAdminGetStatisticsSummary,
  SwaggerAdminGetVerifications,
  SwaggerAdminRejectBusinessVideo,
  SwaggerAdminRejectVerification,
  SwaggerAdminRequestResubmission,
  SwaggerAdminRequestVideoResubmission,
} from './admin.swagger';
import { AdminBusinessVideoActionResponseDto } from './dto/admin-business-video-action-response.dto';
import { AdminVerificationActionResponseDto } from './dto/admin-verification-action-response.dto';
import { GetAdminBusinessesQueryDto } from './dto/get-admin-businesses-query.dto';
import { GetAdminVerificationsQueryDto } from './dto/get-admin-verifications-query.dto';
import { RejectBusinessVideoDto } from './dto/reject-business-video.dto';
import { RejectVerificationDto } from './dto/reject-verification.dto';
import { RequestResubmissionDto } from './dto/request-resubmission.dto';
import { RequestVideoResubmissionDto } from './dto/request-video-resubmission.dto';

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

  @Get('businesses/:id')
  @SwaggerAdminGetBusiness()
  async getBusiness(@Param('id') id: string) {
    const result = await this.adminService.getBusiness(id);
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

  @Post('verifications/:id/resubmission')
  @SwaggerAdminRequestResubmission()
  async requestResubmission(
    @Param('id') verificationId: string,
    @Body() dto: RequestResubmissionDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.adminService.requestResubmission(
      verificationId,
      dto.resubmissionReason,
      user.id,
    );
    return successResponse<AdminVerificationActionResponseDto>(result);
  }

  @Get('statistics/summary')
  @SwaggerAdminGetStatisticsSummary()
  async getStatisticsSummary() {
    const result = await this.adminService.getStatisticsSummary();
    return successResponse(result);
  }

  @Post('business-videos/:id/approve')
  @SwaggerAdminApproveBusinessVideo()
  async approveBusinessVideo(@Param('id') videoId: string, @CurrentUser() user: User) {
    const result = await this.adminService.approveBusinessVideo(videoId, user.id);
    return successResponse<AdminBusinessVideoActionResponseDto>(result);
  }

  @Post('business-videos/:id/reject')
  @SwaggerAdminRejectBusinessVideo()
  async rejectBusinessVideo(
    @Param('id') videoId: string,
    @Body() dto: RejectBusinessVideoDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.adminService.rejectBusinessVideo(
      videoId,
      dto.rejectionReason,
      user.id,
    );

    return successResponse<AdminBusinessVideoActionResponseDto>(result);
  }

  @Post('business-videos/:id/resubmission')
  @SwaggerAdminRequestVideoResubmission()
  async requestVideoResubmission(
    @Param('id') videoId: string,
    @Body() dto: RequestVideoResubmissionDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.adminService.requestVideoResubmission(
      videoId,
      dto.resubmissionReason,
      user.id,
    );

    return successResponse<AdminBusinessVideoActionResponseDto>(result);
  }
}
