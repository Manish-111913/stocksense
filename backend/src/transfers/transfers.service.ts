import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { paginated, skipTake, type Paginated } from '../common/pagination.js';
import { DocumentStatus, Prisma } from '../generated/prisma/client.js';
import { StockService } from '../inventory/stock.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateTransferDto,
  TransferFiltersDto,
  TransferItemDto,
  TransferQueryDto,
  UpdateTransferDto,
} from './dto/transfer.dto.js';

type Tx = Prisma.TransactionClient;
type UserRef = { id: string; fullName: string };
type Place = { id: string; name: string; code: string };

export interface TransferItemView {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  quantity: number;
  /** Current stock at the source location (advisory; validation re-checks under lock) */
  available: number;
  shortage: number;
}

export interface TransferView {
  id: string;
  reference: string;
  status: DocumentStatus;
  transferDate: Date;
  sourceWarehouse: Place;
  sourceLocation: Place;
  destinationWarehouse: Place;
  destinationLocation: Place;
  items: TransferItemView[];
  lineCount: number;
  totalQuantity: number;
  isAvailable: boolean;
  createdBy: UserRef;
  validatedBy: UserRef | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferStockChange {
  productId: string;
  sku: string;
  unitOfMeasure: string;
  quantity: number;
  source: { before: number; after: number };
  destination: { before: number; after: number };
}

export type TransferSummary = Record<DocumentStatus, number> & { total: number };

const PLACE = { select: { id: true, name: true, code: true } } as const;

const TRANSFER_INCLUDE = {
  sourceWarehouse: PLACE,
  sourceLocation: PLACE,
  destinationWarehouse: PLACE,
  destinationLocation: PLACE,
  items: {
    orderBy: { createdAt: 'asc' },
    include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
  },
  createdByUser: { select: { id: true, fullName: true } },
  validatedByUser: { select: { id: true, fullName: true } },
} satisfies Prisma.InternalTransferInclude;

type TransferWithRelations = Prisma.InternalTransferGetPayload<{ include: typeof TRANSFER_INCLUDE }>;

const EDITABLE: DocumentStatus[] = ['DRAFT', 'WAITING'];
const CANCELABLE: DocumentStatus[] = ['DRAFT', 'WAITING', 'READY'];
const EXPORT_LIMIT = 5000;

/**
 * Internal transfers: move stock between locations (total company stock is unchanged).
 * DRAFT →confirm→ READY (source has the stock now) or WAITING; WAITING →check-availability→ READY;
 * READY →validate→ DONE; DRAFT/WAITING/READY →cancel→ CANCELED.
 * Validation moves every line in one transaction (source −, destination +, OUT + IN ledger rows).
 */
@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(query: TransferQueryDto): Promise<Paginated<TransferView>> {
    const where = buildWhere(query);
    const [transfers, total] = await Promise.all([
      this.prisma.internalTransfer.findMany({ where, include: TRANSFER_INCLUDE, orderBy: { createdAt: 'desc' }, ...skipTake(query) }),
      this.prisma.internalTransfer.count({ where }),
    ]);
    return paginated(await this.toViews(transfers), total, query.page, query.limit);
  }

  async summary(): Promise<TransferSummary> {
    const groups = await this.prisma.internalTransfer.groupBy({ by: ['status'], _count: { _all: true } });
    const summary = { DRAFT: 0, WAITING: 0, READY: 0, DONE: 0, CANCELED: 0, total: 0 };
    for (const group of groups) {
      summary[group.status] = group._count._all;
      summary.total += group._count._all;
    }
    return summary;
  }

  async exportCsv(filters: TransferFiltersDto): Promise<string> {
    const transfers = await this.prisma.internalTransfer.findMany({
      where: buildWhere(filters),
      include: TRANSFER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_LIMIT,
    });
    const header = ['Reference', 'Source', 'Destination', 'Transfer Date', 'Status', 'SKU', 'Product', 'Quantity', 'UOM'];
    const rows = transfers.flatMap((transfer) =>
      transfer.items.map((item) => [
        transfer.reference,
        `${transfer.sourceWarehouse.name} / ${transfer.sourceLocation.name}`,
        `${transfer.destinationWarehouse.name} / ${transfer.destinationLocation.name}`,
        transfer.transferDate.toISOString().slice(0, 10),
        transfer.status,
        item.product.sku,
        item.product.name,
        item.quantity.toString(),
        item.product.unitOfMeasure,
      ]),
    );
    return [header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
  }

  async findOne(id: string): Promise<TransferView> {
    const transfer = await this.prisma.internalTransfer.findUnique({ where: { id }, include: TRANSFER_INCLUDE });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return (await this.toViews([transfer]))[0];
  }

  async create(dto: CreateTransferDto, userId: string): Promise<TransferView> {
    await this.assertRoute(this.prisma, dto.sourceWarehouseId, dto.sourceLocationId, dto.destinationWarehouseId, dto.destinationLocationId);
    await this.assertItems(this.prisma, dto.items);

    const transfer = await this.prisma.internalTransfer.create({
      data: {
        sourceWarehouseId: dto.sourceWarehouseId,
        sourceLocationId: dto.sourceLocationId,
        destinationWarehouseId: dto.destinationWarehouseId,
        destinationLocationId: dto.destinationLocationId,
        transferDate: dto.transferDate ? new Date(dto.transferDate) : undefined,
        createdBy: userId,
        updatedBy: userId,
        items: { create: dto.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) },
      },
      include: TRANSFER_INCLUDE,
    });
    return (await this.toViews([transfer]))[0];
  }

  async update(id: string, dto: UpdateTransferDto, userId: string): Promise<TransferView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockTransfer(tx, id);
      if (!EDITABLE.includes(current.status)) {
        throw new ConflictException(`Transfer ${current.reference} is ${current.status} and can no longer be edited`);
      }
      const route = {
        sourceWarehouseId: dto.sourceWarehouseId ?? current.sourceWarehouseId,
        sourceLocationId: dto.sourceLocationId ?? current.sourceLocationId,
        destinationWarehouseId: dto.destinationWarehouseId ?? current.destinationWarehouseId,
        destinationLocationId: dto.destinationLocationId ?? current.destinationLocationId,
      };
      await this.assertRoute(tx, route.sourceWarehouseId, route.sourceLocationId, route.destinationWarehouseId, route.destinationLocationId);
      if (dto.items) await this.assertItems(tx, dto.items);

      await tx.internalTransfer.update({
        where: { id },
        data: { ...route, transferDate: dto.transferDate ? new Date(dto.transferDate) : undefined, updatedBy: userId },
      });
      if (dto.items) {
        await tx.internalTransferItem.deleteMany({ where: { transferId: id } });
        await tx.internalTransferItem.createMany({
          data: dto.items.map((item) => ({ transferId: id, productId: item.productId, quantity: item.quantity })),
        });
      }
    });
    return this.findOne(id);
  }

  /** DRAFT → READY when the source location holds every line now, otherwise WAITING */
  async confirm(id: string, userId: string): Promise<TransferView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockTransfer(tx, id);
      if (current.status !== 'DRAFT') {
        throw new ConflictException(`Transfer ${current.reference} is ${current.status} and can't be confirmed`);
      }
      const available = await this.linesAvailable(tx, id, current.sourceLocationId);
      await tx.internalTransfer.update({ where: { id }, data: { status: available ? 'READY' : 'WAITING', updatedBy: userId } });
    });
    return this.findOne(id);
  }

  /** WAITING → READY once the source holds every line (stays WAITING otherwise) */
  async checkAvailability(id: string, userId: string): Promise<TransferView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockTransfer(tx, id);
      if (current.status !== 'WAITING') {
        throw new ConflictException(`Transfer ${current.reference} is ${current.status}; only WAITING transfers are re-checked`);
      }
      if (await this.linesAvailable(tx, id, current.sourceLocationId)) {
        await tx.internalTransfer.update({ where: { id }, data: { status: 'READY', updatedBy: userId } });
      }
    });
    return this.findOne(id);
  }

  async cancel(id: string, userId: string): Promise<TransferView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockTransfer(tx, id);
      if (!CANCELABLE.includes(current.status)) {
        throw new ConflictException(`Transfer ${current.reference} is ${current.status} and can't be canceled`);
      }
      await tx.internalTransfer.update({ where: { id }, data: { status: 'CANCELED', updatedBy: userId } });
    });
    return this.findOne(id);
  }

  /**
   * READY → DONE. One transaction: lock the transfer, re-check the route, move every line
   * (StockService locks source + destination rows, refuses to overdraw the source, writes OUT + IN
   * ledger rows), then mark it DONE. Any failure rolls all of it back.
   */
  async validate(id: string, userId: string): Promise<TransferView & { stockChanges: TransferStockChange[] }> {
    const stockChanges = await this.prisma.$transaction(async (tx) => {
      const current = await lockTransfer(tx, id);
      if (current.status === 'DONE') throw new ConflictException(`Transfer ${current.reference} has already been validated`);
      if (current.status !== 'READY') {
        throw new ConflictException(`Transfer ${current.reference} is ${current.status}. Only READY transfers can be validated.`);
      }

      const transfer = await tx.internalTransfer.findUniqueOrThrow({ where: { id }, include: TRANSFER_INCLUDE });
      if (transfer.items.length === 0) throw new BadRequestException('Transfer has no product lines');

      const result = await this.stock.apply(
        tx,
        transfer.items.map((item) => ({
          type: 'TRANSFER' as const,
          productId: item.productId,
          fromLocationId: transfer.sourceLocationId,
          toLocationId: transfer.destinationLocationId,
          quantity: item.quantity,
        })),
        { operation: 'INTERNAL_TRANSFER', referenceId: transfer.id, referenceCode: transfer.reference, performedBy: userId },
      );

      await tx.internalTransfer.update({
        where: { id },
        data: { status: 'DONE', validatedBy: userId, validatedAt: new Date(), updatedBy: userId },
      });

      return transfer.items.map((item, index) => {
        const [source, destination] = result.changes[index];
        return {
          productId: item.productId,
          sku: item.product.sku,
          unitOfMeasure: item.product.unitOfMeasure,
          quantity: item.quantity.toNumber(),
          source: { before: source.before.toNumber(), after: source.after.toNumber() },
          destination: { before: destination.before.toNumber(), after: destination.after.toNumber() },
        };
      });
    });

    return { ...(await this.findOne(id)), stockChanges };
  }

  // ---------------------------------------------------------------------------

  private async linesAvailable(tx: Tx, transferId: string, locationId: string) {
    const items = await tx.internalTransferItem.findMany({ where: { transferId }, select: { productId: true, quantity: true } });
    if (items.length === 0) throw new BadRequestException('Transfer has no product lines');
    const rows = await tx.stock.findMany({
      where: { locationId, productId: { in: items.map((item) => item.productId) } },
      select: { productId: true, quantity: true },
    });
    const stock = new Map(rows.map((row) => [row.productId, row.quantity.toNumber()]));
    return items.every((item) => (stock.get(item.productId) ?? 0) >= item.quantity.toNumber());
  }

  /** Both warehouses/locations active, each location inside its warehouse, and source ≠ destination */
  private async assertRoute(db: Tx, sourceWarehouseId: string, sourceLocationId: string, destinationWarehouseId: string, destinationLocationId: string) {
    if (sourceLocationId === destinationLocationId) {
      throw new BadRequestException('Source and destination locations must be different');
    }
    const [warehouses, locations] = await Promise.all([
      db.warehouse.findMany({ where: { id: { in: [sourceWarehouseId, destinationWarehouseId] } }, select: { id: true, name: true, status: true } }),
      db.location.findMany({
        where: { id: { in: [sourceLocationId, destinationLocationId] } },
        select: { id: true, name: true, status: true, warehouseId: true },
      }),
    ]);
    for (const [warehouseId, locationId, side] of [
      [sourceWarehouseId, sourceLocationId, 'Source'],
      [destinationWarehouseId, destinationLocationId, 'Destination'],
    ] as const) {
      const warehouse = warehouses.find((w) => w.id === warehouseId);
      const location = locations.find((l) => l.id === locationId);
      if (!warehouse) throw new BadRequestException(`${side} warehouse not found`);
      if (warehouse.status !== 'ACTIVE') throw new BadRequestException(`Warehouse ${warehouse.name} is inactive`);
      if (!location) throw new BadRequestException(`${side} location not found`);
      if (location.warehouseId !== warehouseId) {
        throw new BadRequestException(`Location ${location.name} does not belong to ${warehouse.name}`);
      }
      if (location.status !== 'ACTIVE') throw new BadRequestException(`Location ${location.name} is inactive`);
    }
  }

  private async assertItems(db: Tx, items: TransferItemDto[]) {
    const ids = items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Each product can appear only once; combine the quantities into one line');
    }
    const products = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, sku: true, status: true } });
    for (const id of ids) {
      const product = products.find((p) => p.id === id);
      if (!product) throw new BadRequestException('Product not found');
      if (product.status !== 'ACTIVE') throw new BadRequestException(`Product ${product.sku} is inactive`);
    }
  }

  private async toViews(transfers: TransferWithRelations[]): Promise<TransferView[]> {
    const pairs = transfers.flatMap((transfer) =>
      transfer.items.map((item) => ({ productId: item.productId, locationId: transfer.sourceLocationId })),
    );
    const rows = pairs.length
      ? await this.prisma.stock.findMany({ where: { OR: pairs }, select: { productId: true, locationId: true, quantity: true } })
      : [];
    const stock = new Map(rows.map((row) => [`${row.productId}|${row.locationId}`, row.quantity.toNumber()]));
    return transfers.map((transfer) => toView(transfer, stock));
  }
}

/** Row lock on the transfer so concurrent edits / transitions / validations serialize */
async function lockTransfer(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<
    {
      reference: string;
      status: DocumentStatus;
      source_warehouse_id: string;
      source_location_id: string;
      destination_warehouse_id: string;
      destination_location_id: string;
    }[]
  >`SELECT reference, status, source_warehouse_id, source_location_id, destination_warehouse_id, destination_location_id
    FROM internal_transfers WHERE id = ${id}::uuid FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException('Transfer not found');
  const row = rows[0];
  return {
    reference: row.reference,
    status: row.status,
    sourceWarehouseId: row.source_warehouse_id,
    sourceLocationId: row.source_location_id,
    destinationWarehouseId: row.destination_warehouse_id,
    destinationLocationId: row.destination_location_id,
  };
}

function buildWhere(filters: TransferFiltersDto): Prisma.InternalTransferWhereInput {
  const transferDate: Prisma.DateTimeFilter = {};
  if (filters.dateFrom) transferDate.gte = startOfDay(filters.dateFrom);
  if (filters.dateTo) transferDate.lt = new Date(startOfDay(filters.dateTo).getTime() + 86_400_000);

  const and: Prisma.InternalTransferWhereInput[] = [];
  if (filters.warehouseId) {
    and.push({ OR: [{ sourceWarehouseId: filters.warehouseId }, { destinationWarehouseId: filters.warehouseId }] });
  }
  if (filters.search) {
    and.push({
      OR: [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { items: { some: { product: { name: { contains: filters.search, mode: 'insensitive' } } } } },
        { items: { some: { product: { sku: { contains: filters.search, mode: 'insensitive' } } } } },
      ],
    });
  }

  return {
    status: filters.status,
    sourceLocationId: filters.sourceLocationId,
    destinationLocationId: filters.destinationLocationId,
    items: filters.productId ? { some: { productId: filters.productId } } : undefined,
    transferDate: filters.dateFrom || filters.dateTo ? transferDate : undefined,
    AND: and,
  };
}

function startOfDay(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

function toView(transfer: TransferWithRelations, stock: Map<string, number>): TransferView {
  const items = transfer.items.map((item) => {
    const quantity = item.quantity.toNumber();
    const available = stock.get(`${item.productId}|${transfer.sourceLocationId}`) ?? 0;
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      unitOfMeasure: item.product.unitOfMeasure,
      quantity,
      available,
      shortage: Math.max(0, quantity - available),
    };
  });
  return {
    id: transfer.id,
    reference: transfer.reference,
    status: transfer.status,
    transferDate: transfer.transferDate,
    sourceWarehouse: transfer.sourceWarehouse,
    sourceLocation: transfer.sourceLocation,
    destinationWarehouse: transfer.destinationWarehouse,
    destinationLocation: transfer.destinationLocation,
    items,
    lineCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    isAvailable: items.length > 0 && items.every((item) => item.shortage === 0),
    createdBy: transfer.createdByUser,
    validatedBy: transfer.validatedByUser,
    validatedAt: transfer.validatedAt,
    createdAt: transfer.createdAt,
    updatedAt: transfer.updatedAt,
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
