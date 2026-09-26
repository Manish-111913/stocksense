import { IntersectionType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Trim } from '../../common/transforms.js';
import { DocumentStatus } from '../../generated/prisma/enums.js';

export class TransferItemDto {
  @IsUUID()
  productId: string;

  /** Quantity to move (> 0, up to 3 decimals) @example 30 */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(999_999_999_999_999)
  quantity: number;
}

export class CreateTransferDto {
  @IsUUID()
  sourceWarehouseId: string;

  /** Must belong to the source warehouse */
  @IsUUID()
  sourceLocationId: string;

  @IsUUID()
  destinationWarehouseId: string;

  /** Must belong to the destination warehouse and differ from the source location */
  @IsUUID()
  destinationLocationId: string;

  /** Defaults to now @example "2026-09-26" */
  @IsOptional()
  @IsDateString()
  transferDate?: string;

  /** One line per product (no duplicates) */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}

/** Only DRAFT / WAITING transfers can be edited; `items` replaces all lines */
export class UpdateTransferDto {
  @IsOptional()
  @IsUUID()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  sourceLocationId?: string;

  @IsOptional()
  @IsUUID()
  destinationWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  destinationLocationId?: string;

  @IsOptional()
  @IsDateString()
  transferDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items?: TransferItemDto[];
}

export class TransferFiltersDto {
  /** Matches the reference, a product name or SKU */
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

  /** Source OR destination is in this warehouse */
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  sourceLocationId?: string;

  @IsOptional()
  @IsUUID()
  destinationWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  destinationLocationId?: string;

  /** Transfer date from (inclusive) @example "2026-09-01" */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Transfer date to (inclusive, whole day) @example "2026-09-30" */
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class TransferQueryDto extends IntersectionType(PaginationQueryDto, TransferFiltersDto) {}
