import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService, OperationsQueryDto } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** KPIs: products in stock, low / out of stock, pending receipts & deliveries, scheduled transfers */
  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }

  /** Operation lines across receipts, deliveries, transfers and adjustments (filter by type, status, warehouse, location, category) */
  @Get('operations')
  operations(@Query() query: OperationsQueryDto) {
    return this.dashboard.operations(query);
  }
}
