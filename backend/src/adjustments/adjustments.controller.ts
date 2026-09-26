import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdjustmentsService } from './adjustments.service.js';
import { AdjustmentFiltersDto, AdjustmentQueryDto, CreateAdjustmentDto, UpdateAdjustmentDto } from './dto/adjustment.dto.js';

@ApiTags('Inventory Adjustments')
@ApiBearerAuth()
@Controller('adjustments')
export class AdjustmentsController {
  constructor(private readonly adjustments: AdjustmentsService) {}

  /** Paginated list; search matches the reference, product name or SKU */
  @Get()
  list(@Query() query: AdjustmentQueryDto) {
    return this.adjustments.list(query);
  }

  @Get('summary')
  summary() {
    return this.adjustments.summary();
  }

  @Get('export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="StockSense_Adjustments.csv"')
  exportCsv(@Query() filters: AdjustmentFiltersDto) {
    return this.adjustments.exportCsv(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adjustments.findOne(id);
  }

  /** Creates a DRAFT; the recorded quantity is read from current stock (never sent by the client) */
  @Post()
  create(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.adjustments.create(dto, user.id);
  }

  /** DRAFT only */
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.adjustments.update(id, dto, user.id);
  }

  /** Re-read the recorded quantity from current stock (after STALE_STOCK) */
  @Post(':id/refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.adjustments.refresh(id, user.id);
  }

  /** DRAFT → DONE: stock := physical count + ledger (409 STALE_STOCK if stock moved). Inventory managers only */
  @Roles('INVENTORY_MANAGER')
  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  apply(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.adjustments.apply(id, user.id);
  }

  /** DRAFT → CANCELED */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.adjustments.cancel(id, user.id);
  }
}
