import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { InventoryOperation, LedgerDirection } from '../generated/prisma/enums.js';
import { InsufficientStockException, InvalidStockOperationException, StaleStockException } from './inventory.exceptions.js';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;
type Quantity = Prisma.Decimal | number | string;
type Tx = Prisma.TransactionClient;

/**
 * One stock change requested by a business document. The four operations map to:
 * receipt → INCREASE, delivery → DECREASE, internal transfer → TRANSFER, adjustment → SET
 */
export type StockInstruction =
  | { type: 'INCREASE'; productId: string; locationId: string; quantity: Quantity }
  | { type: 'DECREASE'; productId: string; locationId: string; quantity: Quantity }
  | { type: 'TRANSFER'; productId: string; fromLocationId: string; toLocationId: string; quantity: Quantity }
  | {
      type: 'SET';
      productId: string;
      locationId: string;
      physicalQuantity: Quantity;
      /** What the adjustment was based on; a mismatch means the stock moved in the meantime */
      expected?: { quantity?: Quantity; version?: number };
    };

/** The business document the change belongs to (written on every ledger row) */
export interface StockOperationContext {
  operation: InventoryOperation;
  referenceId: string;
  referenceCode: string;
  performedBy: string;
}

export interface StockChange {
  locationId: string;
  before: Decimal;
  after: Decimal;
}

/** Per instruction, in order: the balance change(s) it caused (a transfer has source then destination) */
export interface StockApplyResult {
  changes: StockChange[][];
  ledgerEntries: number;
}

interface LockedRow {
  id: string;
  quantity: Decimal;
  originalQuantity: Decimal;
  originalVersion: number;
  dirty: boolean;
}

interface LedgerDraft {
  productId: string;
  locationId: string;
  direction: LedgerDirection;
  quantity: Decimal;
  sourceLocationId: string | null;
  destinationLocationId: string | null;
  before: Decimal;
  after: Decimal;
}

const key = (productId: string, locationId: string) => `${productId}|${locationId}`;

/**
 * The ONLY code allowed to change the `stock` table.
 *
 * `apply()` runs inside the caller's transaction so the stock change, its ledger rows and the
 * document's status update commit or roll back together. It locks every stock row it touches
 * (SELECT … FOR UPDATE, in a fixed order so concurrent operations can't deadlock), re-checks
 * availability against the locked values, updates quantities + versions and appends the ledger.
 */
@Injectable()
export class StockService {
  async apply(tx: Tx, instructions: StockInstruction[], context: StockOperationContext): Promise<StockApplyResult> {
    if (instructions.length === 0) {
      throw new InvalidStockOperationException('No stock lines to apply');
    }
    validateQuantities(instructions);

    const pairs = new Map<string, { productId: string; locationId: string }>();
    for (const instruction of instructions) {
      for (const locationId of locationsOf(instruction)) {
        pairs.set(key(instruction.productId, locationId), { productId: instruction.productId, locationId });
      }
    }

    const { products, locations } = await loadTargets(tx, pairs);
    const rows = await lockRows(tx, [...pairs.values()]);

    const changes: StockChange[][] = [];
    const ledger: LedgerDraft[] = [];

    for (const instruction of instructions) {
      const product = products.get(instruction.productId)!;

      if (instruction.type === 'INCREASE') {
        const row = rows.get(key(instruction.productId, instruction.locationId))!;
        const change = move(row, instruction.locationId, new Decimal(instruction.quantity));
        ledger.push(entry(instruction.productId, change, 'IN', null, instruction.locationId));
        changes.push([change]);
        continue;
      }

      if (instruction.type === 'DECREASE') {
        const row = rows.get(key(instruction.productId, instruction.locationId))!;
        const quantity = new Decimal(instruction.quantity);
        assertAvailable(row, quantity, product, instruction.locationId, locations);
        const change = move(row, instruction.locationId, quantity.negated());
        ledger.push(entry(instruction.productId, change, 'OUT', instruction.locationId, null));
        changes.push([change]);
        continue;
      }

      if (instruction.type === 'TRANSFER') {
        const { fromLocationId, toLocationId } = instruction;
        const quantity = new Decimal(instruction.quantity);
        const source = rows.get(key(instruction.productId, fromLocationId))!;
        const destination = rows.get(key(instruction.productId, toLocationId))!;
        assertAvailable(source, quantity, product, fromLocationId, locations);
        const out = move(source, fromLocationId, quantity.negated());
        const into = move(destination, toLocationId, quantity);
        ledger.push(entry(instruction.productId, out, 'OUT', fromLocationId, toLocationId));
        ledger.push(entry(instruction.productId, into, 'IN', fromLocationId, toLocationId));
        changes.push([out, into]);
        continue;
      }

      // SET (adjustment): stock becomes the physical count
      const row = rows.get(key(instruction.productId, instruction.locationId))!;
      assertNotStale(row, instruction);
      const target = new Decimal(instruction.physicalQuantity);
      // A count that matches the books changes nothing (no version bump, no ledger row)
      const change = target.equals(row.quantity)
        ? { locationId: instruction.locationId, before: row.quantity, after: row.quantity }
        : move(row, instruction.locationId, target.minus(row.quantity));
      const difference = change.after.minus(change.before);
      if (!difference.isZero()) {
        ledger.push(
          difference.isPositive()
            ? entry(instruction.productId, change, 'ADJUSTMENT_IN', null, instruction.locationId)
            : entry(instruction.productId, change, 'ADJUSTMENT_OUT', instruction.locationId, null),
        );
      }
      changes.push([change]);
    }

    // One UPDATE per touched row: final quantity, version + 1
    for (const row of rows.values()) {
      if (!row.dirty) continue;
      await tx.stock.update({
        where: { id: row.id },
        data: { quantity: row.quantity, version: { increment: 1 } },
      });
    }

    if (ledger.length > 0) {
      await tx.stockLedger.createMany({
        data: ledger.map((draft) => ({
          productId: draft.productId,
          warehouseId: locations.get(draft.locationId)!.warehouseId,
          locationId: draft.locationId,
          movementType: context.operation,
          direction: draft.direction,
          quantity: draft.quantity,
          sourceLocationId: draft.sourceLocationId,
          destinationLocationId: draft.destinationLocationId,
          referenceType: context.operation,
          referenceId: context.referenceId,
          referenceCode: context.referenceCode,
          quantityBefore: draft.before,
          quantityAfter: draft.after,
          performedBy: context.performedBy,
        })),
      });
    }

    return { changes, ledgerEntries: ledger.length };
  }

  /** Current quantity + version of one product at one location (0 / version 0 if never stocked) */
  async getAvailable(db: Tx, productId: string, locationId: string) {
    const row = await db.stock.findUnique({
      where: { productId_locationId: { productId, locationId } },
      select: { quantity: true, version: true },
    });
    return { quantity: row?.quantity ?? new Decimal(0), version: row?.version ?? 0 };
  }
}

// -----------------------------------------------------------------------------

function locationsOf(instruction: StockInstruction): string[] {
  return instruction.type === 'TRANSFER' ? [instruction.fromLocationId, instruction.toLocationId] : [instruction.locationId];
}

function validateQuantities(instructions: StockInstruction[]) {
  for (const instruction of instructions) {
    if (instruction.type === 'SET') {
      if (new Decimal(instruction.physicalQuantity).isNegative()) {
        throw new InvalidStockOperationException('Physical quantity cannot be negative');
      }
      continue;
    }
    if (!new Decimal(instruction.quantity).greaterThan(0)) {
      throw new InvalidStockOperationException('Quantity must be greater than zero');
    }
    if (instruction.type === 'TRANSFER' && instruction.fromLocationId === instruction.toLocationId) {
      throw new InvalidStockOperationException('Source and destination locations must be different');
    }
  }
}

type ProductTarget = { id: string; sku: string; name: string; unitOfMeasure: string };
type LocationTarget = { id: string; name: string; warehouseId: string };

/** Every product must exist and be active; every location (and its warehouse) must exist and be active */
async function loadTargets(tx: Tx, pairs: Map<string, { productId: string; locationId: string }>) {
  const productIds = [...new Set([...pairs.values()].map((pair) => pair.productId))];
  const locationIds = [...new Set([...pairs.values()].map((pair) => pair.locationId))];

  const [productRows, locationRows] = await Promise.all([
    tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sku: true, name: true, unitOfMeasure: true, status: true },
    }),
    tx.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, status: true, warehouseId: true, warehouse: { select: { name: true, status: true } } },
    }),
  ]);

  const products = new Map<string, ProductTarget>();
  for (const id of productIds) {
    const product = productRows.find((row) => row.id === id);
    if (!product) throw new InvalidStockOperationException('Product not found');
    if (product.status !== 'ACTIVE') throw new InvalidStockOperationException(`Product ${product.sku} is inactive`);
    products.set(id, product);
  }

  const locations = new Map<string, LocationTarget>();
  for (const id of locationIds) {
    const location = locationRows.find((row) => row.id === id);
    if (!location) throw new InvalidStockOperationException('Location not found');
    if (location.warehouse.status !== 'ACTIVE') {
      throw new InvalidStockOperationException(`Warehouse ${location.warehouse.name} is inactive`);
    }
    if (location.status !== 'ACTIVE') throw new InvalidStockOperationException(`Location ${location.name} is inactive`);
    locations.set(id, location);
  }

  return { products, locations };
}

/** Creates missing stock rows (quantity 0), then locks all of them in a fixed order */
async function lockRows(tx: Tx, pairs: { productId: string; locationId: string }[]) {
  const values = Prisma.join(pairs.map((pair) => Prisma.sql`(${pair.productId}::uuid, ${pair.locationId}::uuid)`));

  await tx.$executeRaw`
    INSERT INTO stock (product_id, location_id)
    VALUES ${values}
    ON CONFLICT (product_id, location_id) DO NOTHING`;

  const locked = await tx.$queryRaw<
    { id: string; product_id: string; location_id: string; quantity: Prisma.Decimal | string; version: number }[]
  >`
    SELECT id, product_id, location_id, quantity, version
    FROM stock
    WHERE (product_id, location_id) IN (${values})
    ORDER BY product_id, location_id
    FOR UPDATE`;

  const rows = new Map<string, LockedRow>();
  for (const row of locked) {
    const quantity = new Decimal(row.quantity);
    rows.set(key(row.product_id, row.location_id), {
      id: row.id,
      quantity,
      originalQuantity: quantity,
      originalVersion: row.version,
      dirty: false,
    });
  }
  return rows;
}

function move(row: LockedRow, locationId: string, delta: Decimal): StockChange {
  const before = row.quantity;
  row.quantity = before.plus(delta);
  row.dirty = true;
  return { locationId, before, after: row.quantity };
}

function assertAvailable(
  row: LockedRow,
  quantity: Decimal,
  product: ProductTarget,
  locationId: string,
  locations: Map<string, LocationTarget>,
) {
  if (row.quantity.lessThan(quantity)) {
    throw new InsufficientStockException({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      locationId,
      locationName: locations.get(locationId)!.name,
      unitOfMeasure: product.unitOfMeasure,
      available: row.quantity.toNumber(),
      requested: quantity.toNumber(),
    });
  }
}

function assertNotStale(row: LockedRow, instruction: Extract<StockInstruction, { type: 'SET' }>) {
  const expected = instruction.expected;
  if (!expected) return;
  const quantityMoved = expected.quantity !== undefined && !row.originalQuantity.equals(new Decimal(expected.quantity));
  const versionMoved = expected.version !== undefined && row.originalVersion !== expected.version;
  if (quantityMoved || versionMoved) {
    throw new StaleStockException({
      productId: instruction.productId,
      locationId: instruction.locationId,
      expectedQuantity: expected.quantity !== undefined ? new Decimal(expected.quantity).toNumber() : undefined,
      currentQuantity: row.originalQuantity.toNumber(),
      expectedVersion: expected.version,
      currentVersion: row.originalVersion,
    });
  }
}

function entry(
  productId: string,
  change: StockChange,
  direction: LedgerDirection,
  sourceLocationId: string | null,
  destinationLocationId: string | null,
): LedgerDraft {
  return {
    productId,
    locationId: change.locationId,
    direction,
    quantity: change.after.minus(change.before).abs(),
    sourceLocationId,
    destinationLocationId,
    before: change.before,
    after: change.after,
  };
}
