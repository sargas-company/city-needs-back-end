import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(query: GetCategoriesQueryDto): Promise<Category[]> {
    const where: Prisma.CategoryWhereInput = {};

    if (query.search) {
      const search = query.search.trim();
      if (search.length > 0) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    if (query.requiresVerification !== undefined) {
      where.requiresVerification = query.requiresVerification;
    }

    if (query.hasGracePeriod !== undefined) {
      where.gracePeriodHours = query.hasGracePeriod ? { not: null } : null;
    }

    return this.prisma.category.findMany({ where });
  }
}
