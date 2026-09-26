import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateRecordStatusDto } from '../common/dto/status.dto.js';
import { CategoriesService } from './categories.service.js';
import { CategoryQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** All categories (optionally only ACTIVE / INACTIVE), with product counts */
  @Get()
  list(@Query() query: CategoryQueryDto) {
    return this.categories.list(query);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  /** Activate / deactivate (inventory managers only) */
  @Roles('INVENTORY_MANAGER')
  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecordStatusDto) {
    return this.categories.setStatus(id, dto.status);
  }
}
