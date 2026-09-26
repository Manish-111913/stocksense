import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { Trim } from '../../common/transforms.js';
import { RecordStatus } from '../../generated/prisma/enums.js';

const UpperCode = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]*$/;
const PHONE_PATTERN = /^[0-9+()\-\s]*$/;

export class CreateSupplierDto {
  /** @example "ABC Steel Suppliers" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /** Optional unique code, stored uppercase @example "SUP-001" */
  @IsOptional()
  @UpperCode()
  @IsString()
  @MaxLength(50)
  @ValidateIf((_, value) => value !== '')
  @Matches(CODE_PATTERN, { message: 'code may only contain letters, digits and . _ / -' })
  code?: string;

  @IsOptional()
  @Trim()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  @Matches(PHONE_PATTERN, { message: 'phone may only contain digits, spaces and + ( ) -' })
  phone?: string;
}

/** Empty strings clear the optional fields */
export class UpdateSupplierDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @UpperCode()
  @IsString()
  @MaxLength(50)
  @ValidateIf((_, value) => value !== '')
  @Matches(CODE_PATTERN, { message: 'code may only contain letters, digits and . _ / -' })
  code?: string;

  @IsOptional()
  @Trim()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  @Matches(PHONE_PATTERN, { message: 'phone may only contain digits, spaces and + ( ) -' })
  phone?: string;
}

export class SupplierQueryDto {
  /** Matches name or code */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
