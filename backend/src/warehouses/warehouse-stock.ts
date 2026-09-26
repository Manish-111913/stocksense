import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

// Read-only stock figures for the warehouse screens (stock itself only changes through inventory operations)

/** Distinct products with stock > 0, per location */
export async function productCountsByLocation(prisma: PrismaService, locationIds: string[]) {
  if (locationIds.length === 0) return new Map<string, number>();
  const rows = await prisma.stock.groupBy({
    by: ['locationId'],
    where: { locationId: { in: locationIds }, quantity: { gt: 0 } },
    _count: { productId: true },
  });
  return new Map(rows.map((row) => [row.locationId, row._count.productId]));
}

/** Distinct products with stock > 0, per warehouse (a product in two racks counts once) */
export async function productCountsByWarehouse(prisma: PrismaService, warehouseIds: string[]) {
  if (warehouseIds.length === 0) return new Map<string, number>();
  const rows = await prisma.$queryRaw<{ warehouse_id: string; products: number }[]>`
    SELECT l.warehouse_id, count(DISTINCT s.product_id)::int AS products
    FROM stock s
    JOIN locations l ON l.id = s.location_id
    WHERE s.quantity > 0 AND l.warehouse_id IN (${Prisma.join(warehouseIds.map((id) => Prisma.sql`${id}::uuid`))})
    GROUP BY l.warehouse_id`;
  return new Map(rows.map((row) => [row.warehouse_id, row.products]));
}

export async function warehouseHoldsStock(prisma: PrismaService, warehouseId: string) {
  const held = await prisma.stock.count({ where: { quantity: { gt: 0 }, location: { warehouseId } } });
  return held > 0;
}

export async function locationHoldsStock(prisma: PrismaService, locationId: string) {
  const held = await prisma.stock.count({ where: { quantity: { gt: 0 }, locationId } });
  return held > 0;
}
