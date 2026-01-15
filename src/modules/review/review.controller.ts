// src/modules/review/review.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination.dto';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';
import { successResponse } from 'src/common/utils/response.util';

import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewService } from './review.service';
import {
  SwaggerCreateReview,
  SwaggerGetBusinessReviews,
  SwaggerUpdateReview,
} from './review.swagger';

@UseGuards(DbUserAuthGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @SwaggerCreateReview()
  async createReview(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    const review = await this.reviewService.createReview(user, dto);

    return successResponse({
      data: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
      message: 'Review created successfully',
    });
  }

  @Patch(':id')
  @SwaggerUpdateReview()
  async updateReview(
    @CurrentUser() user: User,
    @Param('id') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    const review = await this.reviewService.updateReview(user, reviewId, dto);

    return successResponse({
      data: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
      message: 'Review updated successfully',
    });
  }

  @Get('business/:id')
  @SwaggerGetBusinessReviews()
  async getBusinessReviews(
    @Param('id') businessId: string,
    @Query() query: CursorPaginationQueryDto,
  ) {
    const result = await this.reviewService.getBusinessReviewsCursor(businessId, query);

    return successResponse(result);
  }
}
