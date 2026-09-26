const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface DateBounds {
  gte?: Date;
  lt?: Date;
  lte?: Date;
}

/**
 * Inclusive date filter. A date ("2026-09-01") is a whole UTC day; a full ISO date-time is used as-is,
 * so clients send their own local-day boundaries (e.g. local midnight via toISOString()).
 */
export function dateBounds(from?: string, to?: string): DateBounds | undefined {
  if (!from && !to) return undefined;
  const bounds: DateBounds = {};
  if (from) bounds.gte = DATE_ONLY.test(from) ? new Date(`${from}T00:00:00.000Z`) : new Date(from);
  if (to) {
    if (DATE_ONLY.test(to)) bounds.lt = new Date(Date.parse(`${to}T00:00:00.000Z`) + 86_400_000);
    else bounds.lte = new Date(to);
  }
  return bounds;
}
