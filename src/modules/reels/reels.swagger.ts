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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function SwaggerReelsTag() {
  return applyDecorators(ApiTags('Reels'));
}

// ============================================================
// GET /business/me/reel
// ============================================================

export function SwaggerGetMyReel() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get current business Reel',
      description:
        'Returns the current Reel for the authenticated business owner. Returns null if no Reel exists.',
    }),
    ApiOkResponse({
      description: 'Reel found or null if not exists',
      schema: {
        example: {
          success: true,
          data: {
            reel: {
              id: 'uuid',
              businessId: 'uuid',
              video: {
                url: 'https://cdn.example.com/public/business/{id}/reels/video.mp4',
              },
              createdAt: '2026-01-01T12:00:00.000Z',
            },
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
// POST /business/me/reel
// ============================================================

export function SwaggerUpsertReel() {
  return applyDecorators(
    ApiOperation({
      summary: 'Upload or replace business Reel',
      description:
        'Uploads a new Reel video. If a Reel already exists, it will be safely replaced.',
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
      description: 'Reel uploaded or replaced successfully',
      schema: {
        example: {
          success: true,
          data: {
            reel: {
              id: 'uuid',
              businessId: 'uuid',
              video: {
                url: 'https://cdn.example.com/public/business/{id}/reels/video.mp4',
              },
              createdAt: '2026-01-01T12:00:00.000Z',
            },
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
// DELETE /business/me/reel/:reelId
// ============================================================

export function SwaggerDeleteMyReel() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete a specific business Reel by ID',
      description:
        'Deletes a specific Reel by ID. Only allowed when reel status is READY or FAILED.',
    }),
    ApiOkResponse({
      description: 'Reel deleted (or did not exist)',
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
      description: 'Business not found',
    }),
  );
}
