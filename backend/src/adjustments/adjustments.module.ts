import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AdjustmentsController } from './adjustments.controller.js';
import { AdjustmentsService } from './adjustments.service.js';

@Module({
  imports: [InventoryModule],
  controllers: [AdjustmentsController],
  providers: [AdjustmentsService],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
