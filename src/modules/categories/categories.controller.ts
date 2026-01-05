import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipBusinessVerification } from 'src/common/decorators/skip-business-verification.decorator';
import { DbUserAuthGuard } from 'src/common/guards/db-user-auth.guard';

import { CategoriesService } from './categories.service';
import { CategoryDto } from './dto/category.dto';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';

@ApiTags('Categories')
@SkipBusinessVerification()
@UseGuards(DbUserAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOkResponse({ type: CategoryDto, isArray: true })
  async getCategories(@Query() query: GetCategoriesQueryDto): Promise<CategoryDto[]> {
    return this.categoriesService.getCategories(query);
  }
}
