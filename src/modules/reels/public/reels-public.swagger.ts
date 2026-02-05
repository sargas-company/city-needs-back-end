// src/modules/reels/public/reels-public.swagger.ts

import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

export function SwaggerPublicReels() {
  return applyDecorators(
    ApiTags('Reels'),
    ApiBearerAuth(),

    ApiOperation({
      summary: 'Get public reels feed',
      description:
        'Returns public reels feed for authenticated users with cursor pagination. ' +
        'Supports search by business name and filtering by business category.',
    }),

    ApiQuery({
      name: 'cursor',
      required: false,
      description: 'Opaque cursor for pagination',
      example: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTI5VDE0OjAwOjAwLjAwMFoiLCJpZCI6IjEyMyJ9',
    }),

    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of items to return',
      example: 10,
    }),

    ApiQuery({
      name: 'search',
      required: false,
      description: 'Search reels by business name',
      example: 'Grooming',
    }),

    ApiQuery({
      name: 'categoryId',
      required: false,
      description: 'Filter reels by business category',
      example: 'uuid',
    }),

    ApiOkResponse({
      description: 'Public reels feed',
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'uuid' },
                videoUrl: {
                  type: 'string',
                  example: 'https://cdn.example.com/public/business/{id}/reels/video.mp4',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-01-29T14:00:00.000Z',
                },
                business: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'uuid' },
                    name: { type: 'string', example: 'Best Grooming Studio' },
                    categoryId: { type: 'string', example: 'uuid' },
                    ratingAvg: { type: 'number', example: 4.5 },
                    ratingCount: { type: 'number', example: 127 },
                    logoUrl: {
                      type: 'string',
                      nullable: true,
                      example: 'https://cdn.example.com/public/business/{id}/logo/logo.png',
                    },
                    address: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        countryCode: { type: 'string', example: 'CA' },
                        city: { type: 'string', example: 'Regina' },
                        state: { type: 'string', example: 'SK' },
                        addressLine1: { type: 'string', example: '123 Main St' },
                        addressLine2: { type: 'string', nullable: true, example: 'Suite 100' },
                        zip: { type: 'string', nullable: true, example: 'S4P 3Y2' },
                      },
                    },
                  },
                },
              },
            },
          },
          nextCursor: {
            type: 'string',
            nullable: true,
            example: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTI5VDE0OjAwOjAwLjAwMFoiLCJpZCI6IjEyMyJ9',
          },
          hasNextPage: {
            type: 'boolean',
            example: true,
          },
        },
      },
    }),
  );
}
