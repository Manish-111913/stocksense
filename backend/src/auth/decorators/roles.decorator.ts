import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles (checked by the global RolesGuard) */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
