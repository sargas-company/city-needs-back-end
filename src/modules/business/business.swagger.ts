// src/modules/business/business.swagger.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiForbiddenResponse,
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
import { SubmitVerificationResponseDto } from './dto/submit-verification.dto';
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

export function SwaggerSubmitVerification() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Submit business verification',
      description:
        'Allows business owner to submit verification with a document. ' +
        'Can be used in the following scenarios:\n' +
        '- First-time verification for businesses with optional verification categories\n' +
        '- Businesses that skipped verification during onboarding (grace period)\n' +
        '- Resubmission after admin requested changes (RESUBMISSION status)\n' +
        '- Resubmission after rejection (REJECTED status)\n\n' +
        'Creates a new verification record with PENDING status. ' +
        'Cannot submit if there is an active verification (PENDING or APPROVED).',
    }),
    ApiOkResponse({
      description: 'Verification submitted successfully',
      type: SubmitVerificationResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid verification file or file type',
    }),
    ApiForbiddenResponse({
      description: 'Business not found or verification file does not belong to your business',
    }),
    ApiNotFoundResponse({
      description: 'Verification is locked (PENDING/APPROVED) or invalid status for resubmission',
    }),
  );
}

export function SwaggerUploadVerificationFile() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Upload verification document',
      description:
        'Upload a verification document for business verification. ' +
        'Use this endpoint to upload a new document when resubmitting after RESUBMISSION status or REJECTED status. ' +
        'Supported formats: PDF, JPEG, PNG, WEBP, DOC, DOCX, TXT. Max size: 15MB. ' +
        'Only draft files (not attached to verifications) will be replaced.',
    }),
    ApiOkResponse({
      description: 'File uploaded successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              file: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                  url: {
                    type: 'string',
                    example: '/files/550e8400-e29b-41d4-a716-446655440000/signed-url',
                  },
                  type: { type: 'string', example: 'BUSINESS_VERIFICATION_DOCUMENT' },
                  originalName: { type: 'string', example: 'business-license.pdf' },
                  mimeType: { type: 'string', example: 'application/pdf' },
                  sizeBytes: { type: 'number', example: 245678 },
                },
              },
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid file type or file size exceeds 15MB',
    }),
    ApiForbiddenResponse({
      description: 'Business not found or verification is locked (PENDING/APPROVED)',
    }),
  );
}

export function SwaggerGetCurrentVerificationFile() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get current draft verification file',
      description:
        'Returns the current draft verification file (not attached to any verification). ' +
        'Returns null if no draft file exists. Use this to check if a file was uploaded before submitting verification.',
    }),
    ApiOkResponse({
      description: 'Current draft verification file or null',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              file: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                      url: {
                        type: 'string',
                        example: '/files/550e8400-e29b-41d4-a716-446655440000/signed-url',
                      },
                      type: { type: 'string', example: 'BUSINESS_VERIFICATION_DOCUMENT' },
                      originalName: { type: 'string', example: 'business-license.pdf' },
                      mimeType: { type: 'string', example: 'application/pdf' },
                      sizeBytes: { type: 'number', example: 245678 },
                      createdAt: { type: 'string', example: '2026-02-10T12:00:00.000Z' },
                    },
                  },
                  { type: 'null' },
                ],
              },
            },
          },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Business not found',
    }),
  );
}

export function SwaggerDeleteVerificationFile() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete draft verification file',
      description:
        'Deletes a draft verification file by ID. ' +
        'Can only delete files not attached to any verification. ' +
        'Files attached to verifications (regardless of status) cannot be deleted to preserve history.',
    }),
    ApiOkResponse({
      description: 'File deleted successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              deleted: { type: 'boolean', example: true },
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'File not found',
    }),
    ApiForbiddenResponse({
      description: 'Not a verification file or file does not belong to your business',
    }),
    ApiBadRequestResponse({
      description: 'Cannot delete file attached to verification',
    }),
  );
}
