import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdjustmentsModule } from './adjustments/adjustments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { validateEnv } from './config/env.validation.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { LedgerModule } from './ledger/ledger.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { UsersModule } from './users/users.module.js';
import { WarehousesModule } from './warehouses/warehouses.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    WarehousesModule,
    InventoryModule,
    SuppliersModule,
    ReceiptsModule,
    CustomersModule,
    DeliveriesModule,
    TransfersModule,
    AdjustmentsModule,
    LedgerModule,
    DashboardModule,
  ],
})
export class AppModule {}
