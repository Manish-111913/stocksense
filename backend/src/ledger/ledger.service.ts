import { Injectable } from '@nestjs/common';
import { IntersectionType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { paginated, PaginationQueryDto, skipTake, type Paginated } from '../common/pagination.js';
import { Trim } from '../common/transforms.js';
import { InventoryOperation, LedgerDirection, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class LedgerFiltersDto {
  /** Matches product name, SKU or the document reference */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsEnum(InventoryOperation)
  movementType?: InventoryOperation;

  @IsOptional()
  @IsEnum(LedgerDirection)
  direction?: LedgerDirection;

  /** The receipt / delivery / transfer / adjustment id */
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  /** @example "2026-09-01" */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Inclusive, whole day @example "2026-09-30" */
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class LedgerQueryDto extends IntersectionType(PaginationQueryDto, LedgerFiltersDto) {}

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
  reference: { type: InventoryOperation; id: string; code: string };
  performedBy: { id: string; fullName: string };
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

/** Read-only view of the append-only stock ledger (rows are only ever written by StockService) */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LedgerQueryDto): Promise<Paginated<LedgerEntryView>> {
    const where = buildWhere(query);
    const [entries, total] = await Promise.all([
      this.prisma.stockLedger.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...skipTake(query),
      }),
      this.prisma.stockLedger.count({ where }),
    ]);
    return paginated(entries.map(toView), total, query.page, query.limit);
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
      e.reference.code,
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
      e.performedBy.fullName,
    ]);
    return [header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
  }
}

function buildWhere(filters: LedgerFiltersDto): Prisma.StockLedgerWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.dateFrom) createdAt.gte = new Date(`${filters.dateFrom.slice(0, 10)}T00:00:00.000Z`);
  if (filters.dateTo) {
    createdAt.lt = new Date(new Date(`${filters.dateTo.slice(0, 10)}T00:00:00.000Z`).getTime() + 86_400_000);
  }
  return {
    productId: filters.productId,
    warehouseId: filters.warehouseId,
    locationId: filters.locationId,
    movementType: filters.movementType,
    direction: filters.direction,
    referenceId: filters.referenceId,
    createdAt: filters.dateFrom || filters.dateTo ? createdAt : undefined,
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
    reference: { type: entry.referenceType, id: entry.referenceId, code: entry.referenceCode },
    performedBy: entry.performedByUser,
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
