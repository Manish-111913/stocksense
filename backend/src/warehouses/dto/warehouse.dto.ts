import { IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Trim } from '../../common/transforms.js';
import { RecordStatus } from '../../generated/prisma/enums.js';

/** Warehouse and location codes are stored uppercase: "wh-001" and "WH-001" are the same code */
export const UpperCode = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]*$/;
export const CODE_MESSAGE = 'code may only contain letters, digits and . _ / -';

export class CreateWarehouseDto {
  /** @example "Main Warehouse" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  /** @example "WH-001" */
  @UpperCode()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code: string;

  /** Address or notes @example "Primary inventory warehouse" */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateWarehouseDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @UpperCode()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  /** Send an empty string to clear it */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class WarehouseFiltersDto {
  /** Matches warehouse name or code */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}

export class WarehouseQueryDto extends IntersectionType(PaginationQueryDto, WarehouseFiltersDto) {}

export class CreateLocationDto {
  /** @example "Rack A" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  /** Unique within its warehouse @example "RACK-A" */
  @UpperCode()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code: string;
}

/** A location can't move to another warehouse */
export class UpdateLocationDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @UpperCode()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;
}

export class LocationQueryDto {
  /** Matches location name or code */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}

export class AllLocationsQueryDto extends LocationQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
