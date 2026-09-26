import { Controller, Get, Header, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.js';
import { LedgerFiltersDto, LedgerQueryDto, LedgerService } from './ledger.service.js';

// Read-only by design: there are no POST / PATCH / DELETE routes for the ledger
@ApiTags('Stock Ledger')
@ApiBearerAuth()
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  /** Newest first; filter by product, warehouse, location, movement type, direction, document or date */
  @Get()
  list(@Query() query: LedgerQueryDto) {
    return this.ledger.list(query);
  }

  /** Movement counts (total and per movement type) for the same filters */
  @Get('summary')
  summary(@Query() filters: LedgerFiltersDto) {
    return this.ledger.summary(filters);
  }

  @Get('export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="StockSense_Stock_Ledger.csv"')
  exportCsv(@Query() filters: LedgerFiltersDto) {
    return this.ledger.exportCsv(filters);
  }

  @Get('product/:productId')
  byProduct(@Param('productId', ParseUUIDPipe) productId: string, @Query() page: PaginationQueryDto) {
    return this.ledger.list({ ...page, productId });
  }

  @Get('location/:locationId')
  byLocation(@Param('locationId', ParseUUIDPipe) locationId: string, @Query() page: PaginationQueryDto) {
    return this.ledger.list({ ...page, locationId });
  }

  /** All entries written by one receipt / delivery / transfer / adjustment */
  @Get('reference/:referenceId')
  byReference(@Param('referenceId', ParseUUIDPipe) referenceId: string, @Query() page: PaginationQueryDto) {
    return this.ledger.list({ ...page, referenceId });
  }
}
