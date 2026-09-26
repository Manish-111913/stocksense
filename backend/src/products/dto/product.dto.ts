import { IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Trim } from '../../common/transforms.js';
import { RecordStatus } from '../../generated/prisma/enums.js';

/** SKUs and units are stored uppercase so "stl-001" and "STL-001" are the same code */
const Upper = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));

export const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

const MAX_QUANTITY = 999_999_999_999_999; // NUMERIC(18,3)

export class CreateProductDto {
  /** @example "Steel Rod 20mm" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /** Letters, digits and . _ / - (stored uppercase) @example "STL-001" */
  @Upper()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9][A-Z0-9._/-]*$/, { message: 'sku may only contain letters, digits and . _ / -' })
  sku: string;

  @IsUUID()
  categoryId: string;

  /** @example "KG" */
  @Upper()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  unitOfMeasure: string;

  /** Low-stock threshold (total across all locations) @example 50 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_QUANTITY)
  reorderLevel?: number;
}

/** SKU is the product's permanent code and can't be changed after creation */
export class UpdateProductDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Upper()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  unitOfMeasure?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_QUANTITY)
  reorderLevel?: number;
}

export class ProductFiltersDto {
  /** Matches product name or SKU */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  /** Based on total stock vs reorder level */
  @IsOptional()
  @IsIn(STOCK_STATUSES)
  stockStatus?: StockStatus;

  /** Only products with stock in this warehouse */
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

export class ProductQueryDto extends IntersectionType(PaginationQueryDto, ProductFiltersDto) {}
