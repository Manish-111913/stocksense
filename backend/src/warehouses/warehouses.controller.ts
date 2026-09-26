import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateRecordStatusDto } from '../common/dto/status.dto.js';
import {
  CreateLocationDto,
  CreateWarehouseDto,
  LocationQueryDto,
  UpdateWarehouseDto,
  WarehouseQueryDto,
} from './dto/warehouse.dto.js';
import { LocationsService } from './locations.service.js';
import { WarehousesService } from './warehouses.service.js';

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(
    private readonly warehouses: WarehousesService,
    private readonly locations: LocationsService,
  ) {}

  /** Paginated list (with each warehouse's locations); search matches name or code */
  @Get()
  list(@Query() query: WarehouseQueryDto) {
    return this.warehouses.list(query);
  }

  /** KPI counts for the Warehouses screen */
  @Get('summary')
  summary() {
    return this.warehouses.summary();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.warehouses.findOne(id);
  }

  @Roles('INVENTORY_MANAGER')
  @Post()
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthUser) {
    return this.warehouses.create(dto, user.id);
  }

  @Roles('INVENTORY_MANAGER')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseDto, @CurrentUser() user: AuthUser) {
    return this.warehouses.update(id, dto, user.id);
  }

  /** Activate / deactivate (blocked while the warehouse holds stock) */
  @Roles('INVENTORY_MANAGER')
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecordStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.warehouses.setStatus(id, dto.status, user.id);
  }

  @Get(':warehouseId/locations')
  listLocations(@Param('warehouseId', ParseUUIDPipe) warehouseId: string, @Query() query: LocationQueryDto) {
    return this.locations.listForWarehouse(warehouseId, query);
  }

  /** Add a location (the warehouse must be active; code unique within the warehouse) */
  @Roles('INVENTORY_MANAGER')
  @Post(':warehouseId/locations')
  createLocation(@Param('warehouseId', ParseUUIDPipe) warehouseId: string, @Body() dto: CreateLocationDto) {
    return this.locations.create(warehouseId, dto);
  }
}
