import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ActivateBusinessResponseDto } from './dto/activate-business-response.dto';
import { AdminBusinessesResponseDto } from './dto/admin-businesses-response.dto';
import { DeactivateBusinessResponseDto } from './dto/deactivate-business-response.dto';

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
