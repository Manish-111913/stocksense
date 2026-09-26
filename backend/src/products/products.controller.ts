import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateRecordStatusDto } from '../common/dto/status.dto.js';
import { CreateProductDto, ProductFiltersDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Paginated list; search matches name or SKU */
  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }

  /** KPI counts: active products, in stock, low stock, out of stock, warehouses */
  @Get('summary')
  summary() {
    return this.products.summary();
  }

  /** CSV of all products matching the same filters as the list */
  @Get('export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="StockSense_Products.csv"')
  exportCsv(@Query() filters: ProductFiltersDto) {
    return this.products.exportCsv(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  /** Creates the product master record only; stock is added through inventory operations */
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.update(id, dto, user.id);
  }

  /** Activate / deactivate (inventory managers only) */
  @Roles('INVENTORY_MANAGER')
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecordStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.setStatus(id, dto.status, user.id);
  }
}
