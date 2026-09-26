import type { User } from '../generated/prisma/client.js';

/** Public shape of a user; never includes the password hash */
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: User['role'];
  status: User['status'];
  createdAt: Date;
  lastLoginAt: Date | null;
}

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}
