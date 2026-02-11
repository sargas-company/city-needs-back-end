// src/modules/reels/reels.swagger.ts

import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function SwaggerReelsTag() {
  return applyDecorators(ApiTags('Reels'));
}

// ============================================================
// GET /business/me/reels
// ============================================================

export function SwaggerGetMyReels() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all business Reels',
      description: 'Returns all Reels for the authenticated business owner (max 5).',
    }),
    ApiOkResponse({
      description: 'List of reels (may be empty)',
      schema: {
        example: {
          success: true,
          data: {
            reels: [
              {
                id: 'uuid-1',
                businessId: 'uuid',
                status: 'PENDING',
                submittedAt: '2026-01-01T12:00:00.000Z',
                reviewedAt: null,
                rejectionReason: null,
                video: {
                  url: 'https://cdn.example.com/public/business/{id}/reels/video1.mp4',
                },
                createdAt: '2026-01-01T12:00:00.000Z',
                updatedAt: '2026-01-01T12:00:00.000Z',
              },
              {
                id: 'uuid-2',
                businessId: 'uuid',
                status: 'APPROVED',
                submittedAt: '2025-12-25T10:00:00.000Z',
                reviewedAt: '2025-12-26T10:00:00.000Z',
                rejectionReason: null,
                video: {
                  url: 'https://cdn.example.com/public/business/{id}/reels/video2.mp4',
                },
                createdAt: '2025-12-25T10:00:00.000Z',
                updatedAt: '2025-12-26T10:00:00.000Z',
              },
            ],
          },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({
      description: 'Active business is required',
    }),
  );
}

// ============================================================
// POST /business/me/reels
// ============================================================

export function SwaggerUploadReel() {
  return applyDecorators(
    ApiOperation({
      summary: 'Upload new Reel',
      description:
        'Uploads a new Reel video. Maximum 5 reels allowed per business (PENDING + APPROVED). REJECTED reels do not count towards limit.',
    }),
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Video file (mp4 or mov, max 30MB)',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Reel uploaded successfully',
      schema: {
        example: {
          success: true,
          data: {
            reel: {
              id: 'uuid',
              businessId: 'uuid',
              status: 'PENDING',
              submittedAt: '2026-01-01T12:00:00.000Z',
              reviewedAt: null,
              rejectionReason: null,
              video: {
                url: 'https://cdn.example.com/public/business/{id}/reels/video.mp4',
              },
              createdAt: '2026-01-01T12:00:00.000Z',
              updatedAt: '2026-01-01T12:00:00.000Z',
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({
      description: 'Active business is required or maximum 5 reels reached',
    }),
  );
}

// ============================================================
// DELETE /business/me/reels/:id
// ============================================================

export function SwaggerDeleteReel() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete a Reel',
      description: 'Deletes the specified Reel by ID.',
    }),
    ApiParam({
      name: 'id',
      description: 'Reel ID',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'Reel deleted successfully',
      schema: {
        example: {
          success: true,
          data: {
            deleted: true,
          },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({
      description: 'Active business is required',
    }),
    ApiNotFoundResponse({
      description: 'Reel not found',
    }),
  );
}
