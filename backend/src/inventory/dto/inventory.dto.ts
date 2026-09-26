import { IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Trim } from '../../common/transforms.js';

const QueryBoolean = () => Transform(({ value }) => value === true || value === 'true' || value === '1');

export class InventoryFiltersDto {
  /** Matches product name or SKU */
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
  @IsUUID()
  categoryId?: string;

  /** Only products whose total stock is > 0 and ≤ their reorder level */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  lowStock?: boolean;

  /** Only products whose total stock is 0 (their emptied positions, quantity 0) */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  outOfStock?: boolean;
}

export class InventoryQueryDto extends IntersectionType(PaginationQueryDto, InventoryFiltersDto) {}

export class AvailableStockQueryDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  locationId: string;
}
