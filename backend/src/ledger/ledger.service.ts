import { Injectable, NotFoundException } from '@nestjs/common';
import { dateBounds } from '../common/date-range.js';
import { paginated, skipTake, type Paginated } from '../common/pagination.js';
import { InventoryOperation, LedgerDirection, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LedgerFiltersDto, LedgerQueryDto } from './dto/ledger-query.dto.js';

type Place = { id: string; name: string; code: string };

export interface LedgerEntryView {
  id: string;
  createdAt: Date;
  movementType: InventoryOperation;
  direction: LedgerDirection;
  /** Magnitude */
  quantity: number;
  /** +quantity for IN / ADJUSTMENT_IN, −quantity for OUT / ADJUSTMENT_OUT */
  signedQuantity: number;
  quantityBefore: number | null;
  quantityAfter: number | null;
  product: { id: string; name: string; sku: string; unitOfMeasure: string };
  warehouse: Place;
  location: Place;
  sourceLocation: Place | null;
  destinationLocation: Place | null;
  /** The document that caused the movement */
  referenceType: InventoryOperation;
  referenceId: string;
  /** Document reference, e.g. WH/IN/000001 */
  reference: string;
  performedBy: { id: string; name: string };
}

export interface LedgerSummary {
  totalMovements: number;
  byMovementType: Record<InventoryOperation, number>;
}

const PLACE = { select: { id: true, name: true, code: true } } as const;

const ENTRY_INCLUDE = {
  product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
  warehouse: PLACE,
  location: PLACE,
  sourceLocation: PLACE,
  destinationLocation: PLACE,
  performedByUser: { select: { id: true, fullName: true } },
} satisfies Prisma.StockLedgerInclude;

type EntryWithRelations = Prisma.StockLedgerGetPayload<{ include: typeof ENTRY_INCLUDE }>;

/**
 * Read-only view of the append-only stock ledger. Rows are only written by StockService inside the same
 * transaction as the stock change; there is no HTTP route that creates, edits or deletes them.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LedgerQueryDto): Promise<Paginated<LedgerEntryView>> {
    const where = buildWhere(query);
    const order = query.sortOrder ?? 'desc';
    const [entries, total] = await Promise.all([
      this.prisma.stockLedger.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: [{ createdAt: order }, { id: 'asc' }],
        ...skipTake(query),
      }),
      this.prisma.stockLedger.count({ where }),
    ]);
    return paginated(entries.map(toView), total, query.page, query.limit);
  }

  async findOne(id: string): Promise<LedgerEntryView> {
    const entry = await this.prisma.stockLedger.findUnique({ where: { id }, include: ENTRY_INCLUDE });
    if (!entry) throw new NotFoundException('Ledger entry not found');
    return toView(entry);
  }

  /** Movement counts (overall and per type) for the same filters */
  async summary(filters: LedgerFiltersDto): Promise<LedgerSummary> {
    const groups = await this.prisma.stockLedger.groupBy({
      by: ['movementType'],
      where: buildWhere(filters),
      _count: { _all: true },
    });
    const byMovementType = { RECEIPT: 0, DELIVERY: 0, INTERNAL_TRANSFER: 0, ADJUSTMENT: 0 };
    for (const group of groups) byMovementType[group.movementType] = group._count._all;
    return { totalMovements: groups.reduce((sum, g) => sum + g._count._all, 0), byMovementType };
  }

  async exportCsv(filters: LedgerFiltersDto): Promise<string> {
    const entries = await this.prisma.stockLedger.findMany({
      where: buildWhere(filters),
      include: ENTRY_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 10_000,
    });
    const header = ['Timestamp', 'Reference', 'Movement', 'Direction', 'SKU', 'Product', 'Warehouse', 'Location', 'Quantity', 'Before', 'After', 'UOM', 'Performed By'];
    const rows = entries.map(toView).map((e) => [
      e.createdAt.toISOString(),
      e.reference,
      e.movementType,
      e.direction,
      e.product.sku,
      e.product.name,
      e.warehouse.name,
      e.location.name,
      String(e.signedQuantity),
      e.quantityBefore === null ? '' : String(e.quantityBefore),
      e.quantityAfter === null ? '' : String(e.quantityAfter),
      e.product.unitOfMeasure,
      e.performedBy.name,
    ]);
    return [header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
  }
}

function buildWhere(filters: LedgerFiltersDto): Prisma.StockLedgerWhereInput {
  return {
    productId: filters.productId,
    warehouseId: filters.warehouseId,
    locationId: filters.locationId,
    movementType: filters.movementType,
    direction: filters.direction,
    referenceType: filters.referenceType,
    referenceId: filters.referenceId,
    performedBy: filters.performedBy,
    createdAt: dateBounds(filters.dateFrom, filters.dateTo),
    OR: filters.search
      ? [
          { referenceCode: { contains: filters.search, mode: 'insensitive' } },
          { product: { name: { contains: filters.search, mode: 'insensitive' } } },
          { product: { sku: { contains: filters.search, mode: 'insensitive' } } },
        ]
      : undefined,
  };
}

function toView(entry: EntryWithRelations): LedgerEntryView {
  const quantity = entry.quantity.toNumber();
  const outgoing = entry.direction === 'OUT' || entry.direction === 'ADJUSTMENT_OUT';
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    movementType: entry.movementType,
    direction: entry.direction,
    quantity,
    signedQuantity: outgoing ? -quantity : quantity,
    quantityBefore: entry.quantityBefore?.toNumber() ?? null,
    quantityAfter: entry.quantityAfter?.toNumber() ?? null,
    product: entry.product,
    warehouse: entry.warehouse,
    location: entry.location,
    sourceLocation: entry.sourceLocation,
    destinationLocation: entry.destinationLocation,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    reference: entry.referenceCode,
    performedBy: { id: entry.performedByUser.id, name: entry.performedByUser.fullName },
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
