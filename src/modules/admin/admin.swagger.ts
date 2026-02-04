import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminBusinessesResponseDto } from './dto/admin-businesses-response.dto';

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
