import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CategoryDto } from './dto/category.dto';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOkResponse({ type: CategoryDto, isArray: true })
  async getCategories(@Query() query: GetCategoriesQueryDto): Promise<CategoryDto[]> {
    return this.categoriesService.getCategories(query);
  }
}
