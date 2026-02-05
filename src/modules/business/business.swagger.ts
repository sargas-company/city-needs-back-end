// src/modules/business/business.swagger.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CursorPaginationMetaDto,
  CursorPaginationResponseDto,
} from 'src/common/dto/cursor-pagination.dto';

import { BusinessLogoDto } from './dto/business-logo.dto';
import { BusinessPublicResponseDto } from './dto/business-public-response.dto';
import { UpdateBusinessLogoDto } from './dto/update-business-logo.dto';
import { BusinessBookingItemDto } from '../booking/dto/business-booking-item.dto';

export function SwaggerUpdateMyBusinessLogo() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      description:
        'Uploads and replaces the logo of the current user business. ' +
        'Previous logo (if exists) will be permanently deleted.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Business logo file',
      type: UpdateBusinessLogoDto,
    }),
    ApiOkResponse({
      description: 'Business logo updated',
      type: BusinessLogoDto,
    }),
  );
}

export function SwaggerGetBusinessById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get active business by id',
      description:
        'Returns public business profile by id. ' + 'Business must exist and have ACTIVE status.',
    }),
    ApiOkResponse({
      description: 'Active business profile',
      type: BusinessPublicResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Business not found or not active',
    }),
  );
}

export function SwaggerGetBusinessBookings() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiExtraModels(CursorPaginationResponseDto, CursorPaginationMetaDto, BusinessBookingItemDto),
    ApiOperation({
      summary: 'Get business bookings (cursor pagination)',
      description:
        'Returns paginated list of bookings for the business owner. ' +
        'Supports filtering by status and date, with cursor-based pagination.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      description: 'Filter by booking status',
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    }),
    ApiQuery({
      name: 'date',
      required: false,
      description: 'Filter by date (YYYY-MM-DD format in business local time)',
      example: '2026-02-05',
    }),
    ApiQuery({
      name: 'cursor',
      required: false,
      description: 'Cursor for pagination',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of items per page',
      example: 10,
    }),
    ApiOkResponse({
      description: 'List of business bookings',
      schema: {
        allOf: [
          { $ref: getSchemaPath(CursorPaginationResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(BusinessBookingItemDto) },
              },
            },
          },
        ],
      },
    }),
    ApiNotFoundResponse({
      description: 'Business not found',
    }),
  );
}
