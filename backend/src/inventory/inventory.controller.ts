import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.js';
import { AvailableStockQueryDto, InventoryQueryDto } from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';

// Read-only on purpose: stock changes only through receipts, deliveries, transfers and adjustments
@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** Stock positions (product × location), filterable by product, warehouse, location, category and stock level */
  @Get()
  list(@Query() query: InventoryQueryDto) {
    return this.inventory.list(query);
  }

  /** Products at or below their reorder level (but not empty) */
  @Get('low-stock')
  lowStock(@Query() query: PaginationQueryDto) {
    return this.inventory.lowStock(query);
  }

  /** Products with no stock anywhere */
  @Get('out-of-stock')
  outOfStock(@Query() query: PaginationQueryDto) {
    return this.inventory.outOfStock(query);
  }

  /** Quantity + version of one product at one location */
  @Get('available')
  available(@Query() query: AvailableStockQueryDto) {
    return this.inventory.available(query.productId, query.locationId);
  }

  @Get('product/:productId')
  productStock(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventory.productStock(productId);
  }

  @Get('location/:locationId')
  locationStock(@Param('locationId', ParseUUIDPipe) locationId: string) {
    return this.inventory.locationStock(locationId);
  }

  @Get('warehouse/:warehouseId')
  warehouseStock(@Param('warehouseId', ParseUUIDPipe) warehouseId: string) {
    return this.inventory.warehouseStock(warehouseId);
  }
}
