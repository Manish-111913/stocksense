import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { paginated, skipTake, type Paginated } from '../common/pagination.js';
import { DocumentStatus, Prisma } from '../generated/prisma/client.js';
import { StockService } from '../inventory/stock.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdjustmentFiltersDto, AdjustmentQueryDto, CreateAdjustmentDto, RecountAdjustmentDto, UpdateAdjustmentDto } from './dto/adjustment.dto.js';

type Tx = Prisma.TransactionClient;
type UserRef = { id: string; fullName: string };

export interface AdjustmentView {
  id: string;
  reference: string;
  status: DocumentStatus;
  product: { id: string; name: string; sku: string; unitOfMeasure: string };
  warehouse: { id: string; name: string; code: string };
  location: { id: string; name: string; code: string };
  /** Stock when the adjustment was drafted (or applied) */
  recordedQuantity: number;
  recordedStockVersion: number;
  physicalQuantity: number;
  /** physical − recorded */
  difference: number;
  reason: string;
  notes: string | null;
  /** Live stock now; for a DRAFT, `isStale` means stock moved since it was recorded (apply would be rejected) */
  currentQuantity: number;
  isStale: boolean;
  createdBy: UserRef;
  appliedBy: UserRef | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdjustmentSummary extends Record<DocumentStatus, number> {
  total: number;
}

const ADJUSTMENT_INCLUDE = {
  product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  location: { select: { id: true, name: true, code: true } },
  createdByUser: { select: { id: true, fullName: true } },
  appliedByUser: { select: { id: true, fullName: true } },
} satisfies Prisma.InventoryAdjustmentInclude;

type AdjustmentWithRelations = Prisma.InventoryAdjustmentGetPayload<{ include: typeof ADJUSTMENT_INCLUDE }>;

export const OPENING_STOCK_REASON = 'Opening stock';

/** Statuses that are not applied or canceled yet (new adjustments are READY) */
const OPEN_STATUSES: DocumentStatus[] = ['DRAFT', 'WAITING', 'READY'];

/**
 * Inventory adjustments: reconcile recorded stock with a physical count.
 * create → READY →apply→ DONE (stock set to the physical count, ledger ADJUSTMENT_IN/OUT); READY →cancel→ CANCELED.
 * The recorded quantity + stock version are read by the backend when the adjustment is made; apply is rejected
 * (STOCK_CHANGED_SINCE_ADJUSTMENT) if stock moved since, so an old count can't overwrite newer movements.
 * A stale adjustment can only be brought current by a recount (new physical count + fresh recorded snapshot).
 */
@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(query: AdjustmentQueryDto): Promise<Paginated<AdjustmentView>> {
    const where = buildWhere(query);
    const [adjustments, total] = await Promise.all([
      this.prisma.inventoryAdjustment.findMany({ where, include: ADJUSTMENT_INCLUDE, orderBy: { createdAt: 'desc' }, ...skipTake(query) }),
      this.prisma.inventoryAdjustment.count({ where }),
    ]);
    return paginated(await this.toViews(adjustments), total, query.page, query.limit);
  }

  async summary(): Promise<AdjustmentSummary> {
    const groups = await this.prisma.inventoryAdjustment.groupBy({ by: ['status'], _count: { _all: true } });
    const summary = { DRAFT: 0, WAITING: 0, READY: 0, DONE: 0, CANCELED: 0, total: 0 };
    for (const group of groups) {
      summary[group.status] = group._count._all;
      summary.total += group._count._all;
    }
    return summary;
  }

  async exportCsv(filters: AdjustmentFiltersDto): Promise<string> {
    const adjustments = await this.prisma.inventoryAdjustment.findMany({
      where: buildWhere(filters),
      include: ADJUSTMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const header = ['Reference', 'Date', 'Status', 'SKU', 'Product', 'Warehouse', 'Location', 'Recorded', 'Physical', 'Difference', 'UOM', 'Reason'];
    const rows = adjustments.map((a) => [
      a.reference,
      a.createdAt.toISOString().slice(0, 10),
      a.status,
      a.product.sku,
      a.product.name,
      a.warehouse.name,
      a.location.name,
      a.recordedQuantity.toString(),
      a.physicalQuantity.toString(),
      a.difference.toString(),
      a.product.unitOfMeasure,
      a.reason,
    ]);
    return [header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
  }

  async findOne(id: string): Promise<AdjustmentView> {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({ where: { id }, include: ADJUSTMENT_INCLUDE });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    return (await this.toViews([adjustment]))[0];
  }

  async create(dto: CreateAdjustmentDto, userId: string): Promise<AdjustmentView> {
    const id = await this.prisma.$transaction((tx) => this.createDraft(tx, dto, userId));
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateAdjustmentDto, userId: string): Promise<AdjustmentView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockAdjustment(tx, id);
      if (!OPEN_STATUSES.includes(current.status)) {
        throw new ConflictException(`Adjustment ${current.reference} is ${current.status} and can no longer be edited`);
      }
      const productId = dto.productId ?? current.productId;
      const warehouseId = dto.warehouseId ?? current.warehouseId;
      const locationId = dto.locationId ?? current.locationId;
      const moved = productId !== current.productId || locationId !== current.locationId;
      if (moved || warehouseId !== current.warehouseId) await assertTarget(tx, productId, warehouseId, locationId);

      const recorded = moved ? await this.stock.getAvailable(tx, productId, locationId) : null;
      const recordedQuantity = recorded ? recorded.quantity : current.recordedQuantity;
      const physicalQuantity = new Prisma.Decimal(dto.physicalQuantity ?? current.physicalQuantity);

      await tx.inventoryAdjustment.update({
        where: { id },
        data: {
          productId,
          warehouseId,
          locationId,
          recordedQuantity,
          recordedStockVersion: recorded ? recorded.version : undefined,
          physicalQuantity,
          difference: physicalQuantity.minus(recordedQuantity),
          reason: dto.reason,
          notes: dto.notes === undefined ? undefined : dto.notes || null,
          updatedBy: userId,
        },
      });
    });
    return this.findOne(id);
  }

  /**
   * A new physical count for a stale adjustment: stores it together with a fresh recorded quantity + stock
   * version. Re-reading the recorded quantity alone would let the old count overwrite newer movements.
   */
  async recount(id: string, dto: RecountAdjustmentDto, userId: string): Promise<AdjustmentView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockAdjustment(tx, id);
      if (!OPEN_STATUSES.includes(current.status)) {
        throw new ConflictException(`Adjustment ${current.reference} is ${current.status} and can no longer be recounted`);
      }
      const recorded = await this.stock.getAvailable(tx, current.productId, current.locationId);
      const physicalQuantity = new Prisma.Decimal(dto.physicalQuantity);
      await tx.inventoryAdjustment.update({
        where: { id },
        data: {
          recordedQuantity: recorded.quantity,
          recordedStockVersion: recorded.version,
          physicalQuantity,
          difference: physicalQuantity.minus(recorded.quantity),
          updatedBy: userId,
        },
      });
    });
    return this.findOne(id);
  }

  async cancel(id: string, userId: string): Promise<AdjustmentView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockAdjustment(tx, id);
      if (!OPEN_STATUSES.includes(current.status)) {
        throw new ConflictException(`Adjustment ${current.reference} is ${current.status} and can't be canceled`);
      }
      await tx.inventoryAdjustment.update({ where: { id }, data: { status: 'CANCELED', updatedBy: userId } });
    });
    return this.findOne(id);
  }

  /** READY → DONE: stock := physical count (stale check), ledger, status — one transaction */
  async apply(id: string, userId: string): Promise<AdjustmentView> {
    // A repeated apply (retry / double click) is idempotent: returns the DONE adjustment, nothing moves again
    await this.prisma.$transaction((tx) => this.applyDraft(tx, id, userId));
    return this.findOne(id);
  }

  /**
   * Opening stock for a newly created product: an adjustment from the current quantity (0) to the entered
   * count, applied immediately inside the caller's transaction, so it is recorded in the ledger like any
   * other stock change.
   */
  async recordOpeningStock(
    tx: Tx,
    input: { productId: string; warehouseId: string; locationId: string; quantity: number },
    userId: string,
  ) {
    const id = await this.createDraft(
      tx,
      { ...input, physicalQuantity: input.quantity, reason: OPENING_STOCK_REASON, notes: 'Recorded when the product was created' },
      userId,
    );
    await this.applyDraft(tx, id, userId);
    return id;
  }

  // ---------------------------------------------------------------------------

  private async createDraft(tx: Tx, dto: CreateAdjustmentDto, userId: string): Promise<string> {
    await assertTarget(tx, dto.productId, dto.warehouseId, dto.locationId);
    const recorded = await this.stock.getAvailable(tx, dto.productId, dto.locationId);
    const physicalQuantity = new Prisma.Decimal(dto.physicalQuantity);
    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        recordedQuantity: recorded.quantity,
        recordedStockVersion: recorded.version,
        physicalQuantity,
        difference: physicalQuantity.minus(recorded.quantity),
        reason: dto.reason,
        notes: dto.notes || null,
        status: 'READY',
        createdBy: userId,
        updatedBy: userId,
      },
      select: { id: true },
    });
    return adjustment.id;
  }

  private async applyDraft(tx: Tx, id: string, userId: string) {
    const current = await lockAdjustment(tx, id);
    if (current.status === 'DONE') return;
    if (!OPEN_STATUSES.includes(current.status)) {
      throw new ConflictException(`Adjustment ${current.reference} is ${current.status} and can't be applied`);
    }

    // Throws STOCK_CHANGED_SINCE_ADJUSTMENT when stock changed since recordedQuantity/version were read
    const result = await this.stock.apply(
      tx,
      [
        {
          type: 'SET',
          productId: current.productId,
          locationId: current.locationId,
          physicalQuantity: current.physicalQuantity,
          expected: { quantity: current.recordedQuantity, version: current.recordedStockVersion },
        },
      ],
      { operation: 'ADJUSTMENT', referenceId: id, referenceCode: current.reference, performedBy: userId },
    );
    const change = result.changes[0][0];

    await tx.inventoryAdjustment.update({
      where: { id },
      data: {
        status: 'DONE',
        recordedQuantity: change.before,
        difference: change.after.minus(change.before),
        appliedBy: userId,
        appliedAt: new Date(),
        updatedBy: userId,
      },
    });
  }

  private async toViews(adjustments: AdjustmentWithRelations[]): Promise<AdjustmentView[]> {
    const pairs = adjustments.map((a) => ({ productId: a.productId, locationId: a.locationId }));
    const rows = pairs.length
      ? await this.prisma.stock.findMany({ where: { OR: pairs }, select: { productId: true, locationId: true, quantity: true, version: true } })
      : [];
    const stock = new Map(rows.map((row) => [`${row.productId}|${row.locationId}`, row]));
    return adjustments.map((a) => {
      const live = stock.get(`${a.productId}|${a.locationId}`);
      const currentQuantity = live ? live.quantity.toNumber() : 0;
      const currentVersion = live?.version ?? 0;
      return {
        id: a.id,
        reference: a.reference,
        status: a.status,
        product: a.product,
        warehouse: a.warehouse,
        location: a.location,
        recordedQuantity: a.recordedQuantity.toNumber(),
        recordedStockVersion: a.recordedStockVersion,
        physicalQuantity: a.physicalQuantity.toNumber(),
        difference: a.difference.toNumber(),
        reason: a.reason,
        notes: a.notes,
        currentQuantity,
        isStale:
          OPEN_STATUSES.includes(a.status) &&
          (currentVersion !== a.recordedStockVersion || currentQuantity !== a.recordedQuantity.toNumber()),
        createdBy: a.createdByUser,
        appliedBy: a.appliedByUser,
        appliedAt: a.appliedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });
  }
}

/** Product active; warehouse active; location active and inside that warehouse */
async function assertTarget(tx: Tx, productId: string, warehouseId: string, locationId: string) {
  const [product, warehouse, location] = await Promise.all([
    tx.product.findUnique({ where: { id: productId }, select: { sku: true, status: true } }),
    tx.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true, status: true } }),
    tx.location.findUnique({ where: { id: locationId }, select: { name: true, status: true, warehouseId: true } }),
  ]);
  if (!product) throw new BadRequestException('Product not found');
  if (product.status !== 'ACTIVE') throw new BadRequestException(`Product ${product.sku} is inactive`);
  if (!warehouse) throw new BadRequestException('Warehouse not found');
  if (warehouse.status !== 'ACTIVE') throw new BadRequestException(`Warehouse ${warehouse.name} is inactive`);
  if (!location) throw new BadRequestException('Location not found');
  if (location.warehouseId !== warehouseId) {
    throw new BadRequestException(`Location ${location.name} does not belong to ${warehouse.name}`);
  }
  if (location.status !== 'ACTIVE') throw new BadRequestException(`Location ${location.name} is inactive`);
}

async function lockAdjustment(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<
    {
      reference: string;
      status: DocumentStatus;
      product_id: string;
      warehouse_id: string;
      location_id: string;
      recorded_quantity: Prisma.Decimal | string;
      recorded_stock_version: number;
      physical_quantity: Prisma.Decimal | string;
    }[]
  >`SELECT reference, status, product_id, warehouse_id, location_id, recorded_quantity, recorded_stock_version, physical_quantity
    FROM inventory_adjustments WHERE id = ${id}::uuid FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException('Adjustment not found');
  const row = rows[0];
  return {
    reference: row.reference,
    status: row.status,
    productId: row.product_id,
    warehouseId: row.warehouse_id,
    locationId: row.location_id,
    recordedQuantity: new Prisma.Decimal(row.recorded_quantity),
    recordedStockVersion: row.recorded_stock_version,
    physicalQuantity: new Prisma.Decimal(row.physical_quantity),
  };
}

function buildWhere(filters: AdjustmentFiltersDto): Prisma.InventoryAdjustmentWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.dateFrom) createdAt.gte = new Date(`${filters.dateFrom.slice(0, 10)}T00:00:00.000Z`);
  if (filters.dateTo) createdAt.lt = new Date(new Date(`${filters.dateTo.slice(0, 10)}T00:00:00.000Z`).getTime() + 86_400_000);
  return {
    status: filters.status,
    productId: filters.productId,
    warehouseId: filters.warehouseId,
    locationId: filters.locationId,
    createdAt: filters.dateFrom || filters.dateTo ? createdAt : undefined,
    OR: filters.search
      ? [
          { reference: { contains: filters.search, mode: 'insensitive' } },
          { product: { name: { contains: filters.search, mode: 'insensitive' } } },
          { product: { sku: { contains: filters.search, mode: 'insensitive' } } },
        ]
      : undefined,
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
