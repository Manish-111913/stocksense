import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../common/transforms.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../auth/dto/auth.dto.js';

export class UpdateProfileDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 150)
  fullName?: string;

  /** Digits, spaces and + ( ) - only. Send an empty string to clear it */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9+()\-\s]*$/, { message: 'phone may only contain digits, spaces and + ( ) -' })
  phone?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword: string;
}
