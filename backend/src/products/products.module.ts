import { Module } from '@nestjs/common';
import { AdjustmentsModule } from '../adjustments/adjustments.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [AdjustmentsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
