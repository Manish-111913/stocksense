import { IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Trim } from '../../common/transforms.js';
import { DocumentStatus } from '../../generated/prisma/enums.js';

export const DOCUMENT_TYPES = ['RECEIPT', 'DELIVERY', 'INTERNAL_TRANSFER', 'ADJUSTMENT'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Friendly spellings from the UI tabs (Receipts / Delivery / Internal / Adjustments) map to the stored types
const DOCUMENT_TYPE_ALIASES: Record<string, DocumentType> = {
  RECEIPT: 'RECEIPT',
  RECEIPTS: 'RECEIPT',
  DELIVERY: 'DELIVERY',
  DELIVERIES: 'DELIVERY',
  INTERNAL: 'INTERNAL_TRANSFER',
  INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
  INTERNAL_TRANSFERS: 'INTERNAL_TRANSFER',
  TRANSFER: 'INTERNAL_TRANSFER',
  TRANSFERS: 'INTERNAL_TRANSFER',
  ADJUSTMENT: 'ADJUSTMENT',
  ADJUSTMENTS: 'ADJUSTMENT',
};

/** Warehouse / location / category: the scope of the stock KPIs and stock alerts */
export class StockScopeDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

/**
 * Dashboard filters. Stock KPIs follow warehouse / location / category. Pending-document KPIs follow
 * warehouse / location / category / status / date. Document type only narrows the operations list.
 */
export class DashboardFiltersDto extends StockScopeDto {
  /** RECEIPT | DELIVERY | INTERNAL_TRANSFER | ADJUSTMENT (also accepts Receipts / Delivery / Internal / Adjustments) */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? (DOCUMENT_TYPE_ALIASES[value.trim().toUpperCase()] ?? value) : value))
  @IsIn(DOCUMENT_TYPES)
  documentType?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  /** Document date from, inclusive: YYYY-MM-DD (whole UTC day) or a full ISO date-time */
  @IsOptional()
  @IsISO8601({ strict: true })
  dateFrom?: string;

  /** Document date to, inclusive, same format as dateFrom */
  @IsOptional()
  @IsISO8601({ strict: true })
  dateTo?: string;
}

export class OperationsQueryDto extends IntersectionType(PaginationQueryDto, DashboardFiltersDto) {
  /** Matches reference, product name or SKU */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class StockAlertsQueryDto extends IntersectionType(PaginationQueryDto, StockScopeDto) {}
