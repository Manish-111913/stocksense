import { IsEmail, IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail, Trim } from '../../common/transforms.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export class SignupDto {
  /** @example "Manish Kumar" */
  @Trim()
  @IsString()
  @Length(2, 150)
  fullName: string;

  /** @example "manish@example.com" */
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  /** @example "482913" */
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  otp: string;
}

export class ResetPasswordDto {
  /** Short-lived token returned by POST /auth/verify-otp */
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword: string;
}
