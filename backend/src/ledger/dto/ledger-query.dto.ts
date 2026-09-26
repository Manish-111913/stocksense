import { IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Trim } from '../../common/transforms.js';
import { InventoryOperation, LedgerDirection } from '../../generated/prisma/enums.js';

export class LedgerFiltersDto {
  /** Matches product name, SKU or the document reference */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsEnum(InventoryOperation)
  movementType?: InventoryOperation;

  @IsOptional()
  @IsEnum(LedgerDirection)
  direction?: LedgerDirection;

  /** Type of the document that caused the movement */
  @IsOptional()
  @IsEnum(InventoryOperation)
  referenceType?: InventoryOperation;

  /** The receipt / delivery / transfer / adjustment id */
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  /** User id */
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  /**
   * Inclusive. A date ("2026-09-01") is a whole UTC day; a full ISO date-time ("2026-08-31T18:30:00.000Z")
   * is used as-is, so clients can send their own local-day boundaries.
   */
  @IsOptional()
  @IsISO8601({ strict: true })
  dateFrom?: string;

  /** Inclusive, same format as dateFrom @example "2026-09-30" */
  @IsOptional()
  @IsISO8601({ strict: true })
  dateTo?: string;
}

export class LedgerQueryDto extends IntersectionType(PaginationQueryDto, LedgerFiltersDto) {
  /** Newest first by default */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
