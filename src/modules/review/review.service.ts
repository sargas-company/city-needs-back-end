// src/modules/review/review.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Review, User } from '@prisma/client';
import {
  CursorPaginationQueryDto,
  CursorPaginationResponseDto,
} from 'src/common/dto/cursor-pagination.dto';
import { PrismaService } from 'src/prisma/prisma.service';

import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(user: User, dto: CreateReviewDto): Promise<Review> {
    const { bookingId, rating, comment } = dto;

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          userId: true,
          businessId: true,
          review: { select: { id: true } },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== user.id) {
        throw new ForbiddenException('You cannot review this booking');
      }

      if (booking.status !== 'COMPLETED') {
        throw new BadRequestException('Booking is not completed');
      }

      if (booking.review) {
        throw new BadRequestException('Review already exists for this booking');
      }

      const review = await tx.review.create({
        data: {
          bookingId: booking.id,
          businessId: booking.businessId,
          userId: user.id,
          rating,
          comment,
        },
      });

      await this.recalculateBusinessRating(tx, booking.businessId);

      return review;
    });
  }

  async updateReview(user: User, reviewId: string, dto: UpdateReviewDto): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You cannot edit this review');
    }

    const diffMs = Date.now() - review.createdAt.getTime();
    const HOURS_24 = 24 * 60 * 60 * 1000;

    if (diffMs > HOURS_24) {
      throw new BadRequestException('Review edit window has expired');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    if (dto.rating !== undefined) {
      await this.recalculateBusinessRating(this.prisma, review.businessId);
    }

    return updated;
  }

  async getBusinessReviewsCursor(
    businessId: string,
    query: CursorPaginationQueryDto,
  ): Promise<CursorPaginationResponseDto<any>> {
    const limit = query.limit ?? 10;

    const where = { businessId };

    const items = await this.prisma.review.findMany({
      where,
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    const nextCursor = hasNextPage ? data[data.length - 1].id : null;
    const totalCount = await this.prisma.review.count({ where });

    return {
      data: data.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        authorName: r.user?.username ?? null,
      })),
      meta: {
        nextCursor,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage,
      },
    };
  }

  private async recalculateBusinessRating(
    prisma: Prisma.TransactionClient | PrismaService,
    businessId: string,
  ): Promise<void> {
    const aggregate = await prisma.review.aggregate({
      where: { businessId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: {
        ratingAvg: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count.rating,
      },
    });
  }
}
