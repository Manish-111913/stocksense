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

export class ReceiptItemDto {
  @IsUUID()
  productId: string;

  /** Received quantity (> 0, up to 3 decimals) @example 100 */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(999_999_999_999_999)
  quantity: number;
}

export class CreateReceiptDto {
  @IsUUID()
  supplierId: string;

  @IsUUID()
  warehouseId: string;

  /** Must belong to the warehouse */
  @IsUUID()
  locationId: string;

  /** Defaults to now @example "2026-09-26" */
  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  /** One line per product (no duplicates) */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];
}

/** Only DRAFT / WAITING receipts can be edited; `items` replaces all lines */
export class UpdateReceiptDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items?: ReceiptItemDto[];
}

export class ReceiptFiltersDto {
  /** Matches the reference or supplier name */
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
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  /** Receipt date from (inclusive) @example "2026-09-01" */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Receipt date to (inclusive, whole day) @example "2026-09-30" */
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class ReceiptQueryDto extends IntersectionType(PaginationQueryDto, ReceiptFiltersDto) {}
