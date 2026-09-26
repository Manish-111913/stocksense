import { Prisma } from '../generated/prisma/client.js';

/** True when a unique constraint was violated (e.g. a concurrent duplicate insert) */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
