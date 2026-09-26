import { Controller, Get, Header, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { LedgerFiltersDto, LedgerQueryDto } from './dto/ledger-query.dto.js';
import { LedgerService } from './ledger.service.js';

// Read-only by design: there are no POST / PATCH / DELETE routes for the ledger
@ApiTags('Stock Ledger')
@ApiBearerAuth()
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  /** Newest first (sortOrder=asc for oldest first); filter by product, warehouse, location, type, direction, document, user or date */
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

  /** Every movement of one product (all locations) */
  @Get('product/:productId')
  byProduct(@Param('productId', ParseUUIDPipe) productId: string, @Query() query: LedgerQueryDto) {
    return this.ledger.list({ ...query, productId });
  }

  /** Everything that happened at one location */
  @Get('location/:locationId')
  byLocation(@Param('locationId', ParseUUIDPipe) locationId: string, @Query() query: LedgerQueryDto) {
    return this.ledger.list({ ...query, locationId });
  }

  @Get('warehouse/:warehouseId')
  byWarehouse(@Param('warehouseId', ParseUUIDPipe) warehouseId: string, @Query() query: LedgerQueryDto) {
    return this.ledger.list({ ...query, warehouseId });
  }

  /** All entries written by one receipt / delivery / transfer / adjustment (a transfer has an OUT and an IN) */
  @Get('reference/:referenceId')
  byReference(@Param('referenceId', ParseUUIDPipe) referenceId: string, @Query() query: LedgerQueryDto) {
    return this.ledger.list({ ...query, referenceId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ledger.findOne(id);
  }
}
