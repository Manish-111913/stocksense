import type { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client.js';
import {
  InsufficientStockException,
  InvalidStockOperationException,
  StaleStockException,
} from '../src/inventory/inventory.exceptions.js';
import { StockService, type StockInstruction, type StockOperationContext } from '../src/inventory/stock.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

let prisma: PrismaService;
const stock = new StockService();

let userId: string;
let steel: string;
let chair: string;
let rackA: string;
let rackB: string;
let otherRack: string;
let inactiveRack: string;

let refCounter = 0;
function context(operation: StockOperationContext['operation'] = 'RECEIPT'): StockOperationContext {
  refCounter += 1;
  return { operation, referenceId: crypto.randomUUID(), referenceCode: `TEST/${refCounter}`, performedBy: userId };
}

function run(instructions: StockInstruction[], operation?: StockOperationContext['operation']) {
  const ctx = context(operation);
  return prisma.$transaction((tx) => stock.apply(tx, instructions, ctx)).then((result) => ({ result, ctx }));
}

async function qty(productId: string, locationId: string) {
  const row = await prisma.stock.findUnique({ where: { productId_locationId: { productId, locationId } } });
  return { quantity: row ? row.quantity.toNumber() : 0, version: row?.version ?? 0 };
}

beforeAll(async () => {
  prisma = new PrismaService({ getOrThrow: () => inject('databaseUrl') } as unknown as ConfigService);
  await prisma.$connect();

  const user = await prisma.user.create({ data: { fullName: 'Stock Test', email: 'stock@test.local', passwordHash: 'x' } });
  userId = user.id;
  const category = await prisma.category.create({ data: { name: 'Raw' } });
  steel = (await prisma.product.create({
    data: { name: 'Steel Rod', sku: 'STL-001', categoryId: category.id, unitOfMeasure: 'KG', reorderLevel: 50, createdBy: userId },
  })).id;
  chair = (await prisma.product.create({
    data: { name: 'Chair', sku: 'CHR-001', categoryId: category.id, unitOfMeasure: 'PCS', createdBy: userId },
  })).id;
  const main = await prisma.warehouse.create({ data: { name: 'Main', code: 'WH-1', createdBy: userId } });
  const second = await prisma.warehouse.create({ data: { name: 'Second', code: 'WH-2', createdBy: userId } });
  rackA = (await prisma.location.create({ data: { warehouseId: main.id, name: 'Rack A', code: 'A' } })).id;
  rackB = (await prisma.location.create({ data: { warehouseId: main.id, name: 'Rack B', code: 'B' } })).id;
  otherRack = (await prisma.location.create({ data: { warehouseId: second.id, name: 'Rack A', code: 'A' } })).id;
  inactiveRack = (await prisma.location.create({ data: { warehouseId: main.id, name: 'Closed', code: 'C', status: 'INACTIVE' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('StockService', () => {
  it('increase creates the stock row and a ledger entry', async () => {
    const { result, ctx } = await run([{ type: 'INCREASE', productId: steel, locationId: rackA, quantity: 100 }]);
    expect(result.changes[0][0].after.toNumber()).toBe(100);
    expect(await qty(steel, rackA)).toEqual({ quantity: 100, version: 1 });

    const ledger = await prisma.stockLedger.findMany({ where: { referenceId: ctx.referenceId } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ direction: 'IN', movementType: 'RECEIPT', referenceCode: ctx.referenceCode });
    expect(ledger[0].quantity.toNumber()).toBe(100);
    expect(ledger[0].quantityBefore?.toNumber()).toBe(0);
    expect(ledger[0].quantityAfter?.toNumber()).toBe(100);
  });

  it('increase adds to an existing row', async () => {
    await run([{ type: 'INCREASE', productId: steel, locationId: rackA, quantity: 50 }]);
    expect((await qty(steel, rackA)).quantity).toBe(150);
  });

  it('decrease refuses to go below zero and changes nothing', async () => {
    const before = await qty(steel, rackA);
    const ledgerBefore = await prisma.stockLedger.count();
    await expect(run([{ type: 'DECREASE', productId: steel, locationId: rackA, quantity: 151 }], 'DELIVERY')).rejects.toBeInstanceOf(
      InsufficientStockException,
    );
    expect(await qty(steel, rackA)).toEqual(before);
    expect(await prisma.stockLedger.count()).toBe(ledgerBefore);
  });

  it('decrease reduces stock and writes an OUT entry', async () => {
    const { ctx } = await run([{ type: 'DECREASE', productId: steel, locationId: rackA, quantity: 30 }], 'DELIVERY');
    expect((await qty(steel, rackA)).quantity).toBe(120);
    const [entry] = await prisma.stockLedger.findMany({ where: { referenceId: ctx.referenceId } });
    expect(entry).toMatchObject({ direction: 'OUT', movementType: 'DELIVERY', sourceLocationId: rackA });
  });

  it('transfer moves stock without changing the total, with OUT + IN entries', async () => {
    const { ctx } = await run(
      [{ type: 'TRANSFER', productId: steel, fromLocationId: rackA, toLocationId: otherRack, quantity: 20 }],
      'INTERNAL_TRANSFER',
    );
    expect((await qty(steel, rackA)).quantity).toBe(100);
    expect((await qty(steel, otherRack)).quantity).toBe(20);
    const entries = await prisma.stockLedger.findMany({ where: { referenceId: ctx.referenceId }, orderBy: { direction: 'asc' } });
    expect(entries.map((e) => [e.direction, e.locationId, e.quantity.toNumber()])).toEqual([
      ['IN', otherRack, 20],
      ['OUT', rackA, 20],
    ]);
    expect(entries.every((e) => e.sourceLocationId === rackA && e.destinationLocationId === otherRack)).toBe(true);
  });

  it('transfer rejects the same source and destination', async () => {
    await expect(
      run([{ type: 'TRANSFER', productId: steel, fromLocationId: rackA, toLocationId: rackA, quantity: 1 }], 'INTERNAL_TRANSFER'),
    ).rejects.toBeInstanceOf(InvalidStockOperationException);
  });

  it('adjustment sets stock to the physical count', async () => {
    const current = await qty(steel, rackA);
    const { result, ctx } = await run(
      [{ type: 'SET', productId: steel, locationId: rackA, physicalQuantity: 97, expected: { quantity: 100, version: current.version } }],
      'ADJUSTMENT',
    );
    const change = result.changes[0][0];
    expect(change.after.minus(change.before).toNumber()).toBe(-3);
    expect((await qty(steel, rackA)).quantity).toBe(97);
    const [entry] = await prisma.stockLedger.findMany({ where: { referenceId: ctx.referenceId } });
    expect(entry).toMatchObject({ direction: 'ADJUSTMENT_OUT' });
    expect(entry.quantity.toNumber()).toBe(3);
  });

  it('adjustment based on stale stock is rejected', async () => {
    await expect(
      run([{ type: 'SET', productId: steel, locationId: rackA, physicalQuantity: 90, expected: { quantity: 100, version: 1 } }], 'ADJUSTMENT'),
    ).rejects.toBeInstanceOf(StaleStockException);
    expect((await qty(steel, rackA)).quantity).toBe(97);
  });

  it('a count matching the books changes nothing', async () => {
    const before = await qty(steel, rackA);
    const { result } = await run([{ type: 'SET', productId: steel, locationId: rackA, physicalQuantity: 97 }], 'ADJUSTMENT');
    expect(result.ledgerEntries).toBe(0);
    expect(await qty(steel, rackA)).toEqual(before);
  });

  it('inactive locations and bad quantities are rejected', async () => {
    await expect(run([{ type: 'INCREASE', productId: steel, locationId: inactiveRack, quantity: 5 }])).rejects.toBeInstanceOf(
      InvalidStockOperationException,
    );
    await expect(run([{ type: 'INCREASE', productId: steel, locationId: rackA, quantity: 0 }])).rejects.toBeInstanceOf(
      InvalidStockOperationException,
    );
  });

  it('a multi-line operation is all-or-nothing', async () => {
    const steelBefore = await qty(steel, rackA);
    await expect(
      run(
        [
          { type: 'DECREASE', productId: steel, locationId: rackA, quantity: 10 },
          { type: 'DECREASE', productId: chair, locationId: rackA, quantity: 1 }, // no chairs there
        ],
        'DELIVERY',
      ),
    ).rejects.toBeInstanceOf(InsufficientStockException);
    expect(await qty(steel, rackA)).toEqual(steelBefore);
  });

  it('concurrent deliveries cannot oversell (10 in stock: 8 and 7 requested at once)', async () => {
    await run([{ type: 'INCREASE', productId: chair, locationId: rackB, quantity: 10 }]);

    const outcomes = await Promise.allSettled([
      run([{ type: 'DECREASE', productId: chair, locationId: rackB, quantity: 8 }], 'DELIVERY'),
      run([{ type: 'DECREASE', productId: chair, locationId: rackB, quantity: 7 }], 'DELIVERY'),
    ]);

    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o): o is PromiseRejectedResult => o.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(InsufficientStockException);
    expect([2, 3]).toContain((await qty(chair, rackB)).quantity);
  });

  it('opposite concurrent transfers never deadlock and keep the total', async () => {
    await run([{ type: 'INCREASE', productId: steel, locationId: rackB, quantity: 97 }]);
    const total = async () => (await qty(steel, rackA)).quantity + (await qty(steel, rackB)).quantity;
    const before = await total();

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        run(
          [
            i % 2 === 0
              ? { type: 'TRANSFER', productId: steel, fromLocationId: rackA, toLocationId: rackB, quantity: 1 }
              : { type: 'TRANSFER', productId: steel, fromLocationId: rackB, toLocationId: rackA, quantity: 1 },
          ],
          'INTERNAL_TRANSFER',
        ),
      ),
    );
    expect(await total()).toBe(before);
  });

  it('the ledger always explains current stock', async () => {
    const rows = await prisma.stock.findMany();
    for (const row of rows) {
      const entries = await prisma.stockLedger.findMany({ where: { productId: row.productId, locationId: row.locationId } });
      const net = entries.reduce(
        (sum, e) => (['OUT', 'ADJUSTMENT_OUT'].includes(e.direction) ? sum.minus(e.quantity) : sum.plus(e.quantity)),
        new Prisma.Decimal(0),
      );
      expect(net.equals(row.quantity)).toBe(true);
    }
  });
});
