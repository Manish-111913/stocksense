import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';
import { WarehousesController } from './warehouses.controller.js';
import { WarehousesService } from './warehouses.service.js';

// Physical structure only (warehouses → locations); stock is changed exclusively by inventory operations
@Module({
  controllers: [WarehousesController, LocationsController],
  providers: [WarehousesService, LocationsService],
  exports: [WarehousesService, LocationsService],
})
export class WarehousesModule {}
