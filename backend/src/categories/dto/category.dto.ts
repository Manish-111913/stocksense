import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms.js';
import { RecordStatus } from '../../generated/prisma/enums.js';

export class CreateCategoryDto {
  /** @example "Raw Materials" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  /** Send an empty string to clear it */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CategoryQueryDto {
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
