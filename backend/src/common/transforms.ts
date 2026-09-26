import { Transform } from 'class-transformer';

/** Emails are stored lowercase (enforced by a DB check), so normalize before validation and lookup */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
