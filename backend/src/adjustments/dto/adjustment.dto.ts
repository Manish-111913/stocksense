import { IntersectionType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Trim } from '../../common/transforms.js';
import { DocumentStatus } from '../../generated/prisma/enums.js';

const MAX_QUANTITY = 999_999_999_999_999;

/** The recorded quantity is never sent: the backend reads it from current stock */
export class CreateAdjustmentDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  warehouseId: string;

  /** Must belong to the warehouse */
  @IsUUID()
  locationId: string;

  /** What was physically counted (≥ 0) @example 97 */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_QUANTITY)
  physicalQuantity: number;

  /** @example "Damaged during handling" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** DRAFT only. Changing product/location re-reads the recorded quantity */
export class UpdateAdjustmentDto {
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
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_QUANTITY)
  physicalQuantity?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason?: string;

  /** Send an empty string to clear */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AdjustmentFiltersDto {
  /** Matches the reference, product name or SKU */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  /** Created from (inclusive) @example "2026-09-01" */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Created to (inclusive, whole day) @example "2026-09-30" */
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class AdjustmentQueryDto extends IntersectionType(PaginationQueryDto, AdjustmentFiltersDto) {}
