import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ActivateBusinessResponseDto } from './dto/activate-business-response.dto';
import { AdminBusinessDetailDto } from './dto/admin-business-detail.dto';
import { AdminBusinessVideoActionResponseDto } from './dto/admin-business-video-action-response.dto';
import { AdminBusinessesResponseDto } from './dto/admin-businesses-response.dto';
import { AdminStatisticsSummaryDto } from './dto/admin-statistics-summary.dto';
import { AdminVerificationActionResponseDto } from './dto/admin-verification-action-response.dto';
import { AdminVerificationDetailDto } from './dto/admin-verification-detail.dto';
import { AdminVerificationsResponseDto } from './dto/admin-verifications-response.dto';
import { DeactivateBusinessResponseDto } from './dto/deactivate-business-response.dto';

export function SwaggerAdminGetStatisticsSummary() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get platform statistics summary (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Platform statistics including businesses by category and totals',
      type: AdminStatisticsSummaryDto,
    }),
  );
}

export function SwaggerAdminGetBusinesses() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all businesses (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'List of all businesses',
      type: AdminBusinessesResponseDto,
    }),
  );
}

export function SwaggerAdminGetBusiness() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get full business details including all verifications (admin only)',
    }),
    ApiResponse({
      status: 200,
      description: 'Business details with all verifications',
      type: AdminBusinessDetailDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Business not found',
    }),
  );
}

export function SwaggerAdminGetVerifications() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get all business verifications (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'List of business verifications',
      type: AdminVerificationsResponseDto,
    }),
  );
}

export function SwaggerAdminGetVerification() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get business verification by ID (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business verification details',
      type: AdminVerificationDetailDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Verification not found',
    }),
  );
}

export function SwaggerAdminDeactivateBusiness() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Deactivate a business (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business successfully deactivated',
      type: DeactivateBusinessResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Business not found',
    }),
  );
}

export function SwaggerAdminActivateBusiness() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Activate a business (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business successfully activated with calculated status',
      type: ActivateBusinessResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Business not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Business is not suspended',
    }),
  );
}

export function SwaggerAdminApproveVerification() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Approve business verification (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business verification approved',
      type: AdminVerificationActionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Verification not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Only PENDING verification can be approved',
    }),
  );
}

export function SwaggerAdminRejectVerification() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Reject business verification (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business verification rejected',
      type: AdminVerificationActionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Verification not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Only PENDING verification can be rejected',
    }),
  );
}

export function SwaggerAdminRequestResubmission() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Request resubmission of business verification (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business verification moved to RESUBMISSION status',
      type: AdminVerificationActionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Verification not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Only PENDING verification can be moved to RESUBMISSION',
    }),
  );
}

export function SwaggerAdminApproveBusinessVideo() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Approve business video (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business video approved',
      type: AdminBusinessVideoActionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Video not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Video is not READY or not PENDING',
    }),
  );
}

export function SwaggerAdminRejectBusinessVideo() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Reject business video (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business video rejected',
      type: AdminBusinessVideoActionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Video not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Video is not READY or not PENDING',
    }),
  );
}

export function SwaggerAdminRequestVideoResubmission() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Request video resubmission (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Business video moved to RESUBMISSION',
      type: AdminBusinessVideoActionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Video not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Video is not READY or not PENDING',
    }),
  );
}
