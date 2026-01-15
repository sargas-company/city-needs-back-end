// src/modules/review/review.swagger.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CursorPaginationResponseDto } from 'src/common/dto/cursor-pagination.dto';

import { ReviewListItemDto } from './dto/review-list-item.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

export function SwaggerCreateReview() {
  return applyDecorators(
    ApiTags('Reviews'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create review for completed booking' }),
    ApiCreatedResponse({
      description: 'Review created successfully',
      type: ReviewResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'User is not authenticated',
    }),
    ApiForbiddenResponse({
      description: 'User cannot review this booking',
    }),
    ApiNotFoundResponse({
      description: 'Booking not found',
    }),
  );
}

export function SwaggerUpdateReview() {
  return applyDecorators(
    ApiTags('Reviews'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update review (allowed within 24 hours)' }),
    ApiOkResponse({
      description: 'Review updated successfully',
      type: ReviewResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'User is not authenticated',
    }),
    ApiForbiddenResponse({
      description: 'User cannot edit this review',
    }),
    ApiNotFoundResponse({
      description: 'Review not found',
    }),
  );
}

export function SwaggerGetBusinessReviews() {
  return applyDecorators(
    ApiTags('Reviews'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get reviews for business (cursor pagination)',
    }),
    ApiParam({
      name: 'id',
      description: 'Business ID',
    }),
    ApiQuery({
      name: 'cursor',
      required: false,
      description: 'Cursor for pagination',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of items to return',
    }),
    ApiOkResponse({
      description: 'List of reviews for the business',
      type: CursorPaginationResponseDto<ReviewListItemDto>,
    }),
    ApiUnauthorizedResponse({
      description: 'User is not authenticated',
    }),
  );
}
