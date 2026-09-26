import type { UserRole } from '../generated/prisma/enums.js';

/** The authenticated user attached to each request by JwtAuthGuard */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Access-token payload: kept small, never contains secrets */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export interface ResetTokenPayload {
  sub: string;
  otpId: string;
  type: 'password-reset';
}
