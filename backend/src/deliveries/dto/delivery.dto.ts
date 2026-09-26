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

export class DeliveryItemDto {
  @IsUUID()
  productId: string;

  /** Quantity to deliver (> 0, up to 3 decimals) @example 100 */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(999_999_999_999_999)
  quantity: number;
}

export class CreateDeliveryDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  warehouseId: string;

  /** Location the stock is taken from; must belong to the warehouse */
  @IsUUID()
  sourceLocationId: string;

  /** Defaults to now @example "2026-09-26" */
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  /** One line per product (no duplicates) */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemDto)
  items: DeliveryItemDto[];
}

/** Only DRAFT / WAITING deliveries can be edited; `items` replaces all lines */
export class UpdateDeliveryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  sourceLocationId?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemDto)
  items?: DeliveryItemDto[];
}

export class DeliveryFiltersDto {
  /** Matches the reference or customer name */
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
  customerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  sourceLocationId?: string;

  /** Delivery date from (inclusive) @example "2026-09-01" */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Delivery date to (inclusive, whole day) @example "2026-09-30" */
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class DeliveryQueryDto extends IntersectionType(PaginationQueryDto, DeliveryFiltersDto) {}
