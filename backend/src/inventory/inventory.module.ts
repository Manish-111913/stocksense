import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { StockService } from './stock.service.js';

// StockService is exported for the operation modules (receipts, deliveries, transfers, adjustments);
// it is the only code that mutates the `stock` table
@Module({
  controllers: [InventoryController],
  providers: [InventoryService, StockService],
  exports: [InventoryService, StockService],
})
export class InventoryModule {}
