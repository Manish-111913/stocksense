import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardFiltersDto, OperationsQueryDto, StockAlertsQueryDto, StockScopeDto } from './dto/dashboard-query.dto.js';

// Read-only for both roles: nothing here changes stock or documents
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** All KPIs + the filters that were applied */
  @Get()
  overview(@Query() filters: DashboardFiltersDto) {
    return this.dashboard.dashboard(filters);
  }

  /** Products in stock, low stock, out of stock (warehouse / location / category scope) */
  @Get('inventory-summary')
  inventorySummary(@Query() scope: StockScopeDto) {
    return this.dashboard.inventorySummary(scope);
  }

  /** Pending receipts / deliveries / scheduled transfers / pending adjustments */
  @Get('operations-summary')
  operationsSummary(@Query() filters: DashboardFiltersDto) {
    return this.dashboard.operationsSummary(filters);
  }

  /** The low / out-of-stock products behind the KPIs, out of stock first */
  @Get('stock-alerts')
  stockAlerts(@Query() query: StockAlertsQueryDto) {
    return this.dashboard.stockAlerts(query);
  }

  /** Document lines across receipts, deliveries, transfers and adjustments, newest first */
  @Get('operations')
  operations(@Query() query: OperationsQueryDto) {
    return this.dashboard.operations(query);
  }
}
