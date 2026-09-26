import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { paginated, skipTake, type Paginated } from '../common/pagination.js';
import { DocumentStatus, Prisma } from '../generated/prisma/client.js';
import { StockService } from '../inventory/stock.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReceiptDto, ReceiptFiltersDto, ReceiptItemDto, ReceiptQueryDto, UpdateReceiptDto } from './dto/receipt.dto.js';

type Tx = Prisma.TransactionClient;

export interface ReceiptView {
  id: string;
  reference: string;
  status: DocumentStatus;
  receiptDate: Date;
  supplier: { id: string; name: string; code: string | null; status: string };
  warehouse: { id: string; name: string; code: string };
  location: { id: string; name: string; code: string };
  items: {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    unitOfMeasure: string;
    quantity: number;
  }[];
  lineCount: number;
  totalQuantity: number;
  createdBy: { id: string; fullName: string };
  validatedBy: { id: string; fullName: string } | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptStockChange {
  productId: string;
  sku: string;
  unitOfMeasure: string;
  quantity: number;
  before: number;
  after: number;
}

export type ReceiptSummary = Record<DocumentStatus, number> & { total: number };

const RECEIPT_INCLUDE = {
  supplier: { select: { id: true, name: true, code: true, status: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  location: { select: { id: true, name: true, code: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
  },
  createdByUser: { select: { id: true, fullName: true } },
  validatedByUser: { select: { id: true, fullName: true } },
} satisfies Prisma.ReceiptInclude;

type ReceiptWithRelations = Prisma.ReceiptGetPayload<{ include: typeof RECEIPT_INCLUDE }>;

const EDITABLE: DocumentStatus[] = ['DRAFT', 'WAITING'];
const CANCELABLE: DocumentStatus[] = ['DRAFT', 'WAITING', 'READY'];
const EXPORT_LIMIT = 5000;

/**
 * Receipts: incoming stock from suppliers.
 * DRAFT → (confirm) WAITING → (ready) READY → (validate) DONE; DRAFT / WAITING / READY → (cancel) CANCELED.
 * Only validation changes stock, through StockService, in the same transaction as the status change.
 */
@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(query: ReceiptQueryDto): Promise<Paginated<ReceiptView>> {
    const where = buildWhere(query);
    const [receipts, total] = await Promise.all([
      this.prisma.receipt.findMany({ where, include: RECEIPT_INCLUDE, orderBy: { createdAt: 'desc' }, ...skipTake(query) }),
      this.prisma.receipt.count({ where }),
    ]);
    return paginated(receipts.map(toView), total, query.page, query.limit);
  }

  /** Receipt counts per status (for the KPI cards) */
  async summary(): Promise<ReceiptSummary> {
    const groups = await this.prisma.receipt.groupBy({ by: ['status'], _count: { _all: true } });
    const summary = { DRAFT: 0, WAITING: 0, READY: 0, DONE: 0, CANCELED: 0, total: 0 };
    for (const group of groups) {
      summary[group.status] = group._count._all;
      summary.total += group._count._all;
    }
    return summary;
  }

  async exportCsv(filters: ReceiptFiltersDto): Promise<string> {
    const receipts = await this.prisma.receipt.findMany({
      where: buildWhere(filters),
      include: RECEIPT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_LIMIT,
    });
    const header = ['Reference', 'Supplier', 'Warehouse', 'Location', 'Receipt Date', 'Status', 'SKU', 'Product', 'Quantity', 'UOM'];
    const rows = receipts.flatMap((receipt) =>
      receipt.items.map((item) => [
        receipt.reference,
        receipt.supplier.name,
        receipt.warehouse.name,
        receipt.location.name,
        receipt.receiptDate.toISOString().slice(0, 10),
        receipt.status,
        item.product.sku,
        item.product.name,
        item.quantity.toString(),
        item.product.unitOfMeasure,
      ]),
    );
    return [header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
  }

  async findOne(id: string): Promise<ReceiptView> {
    const receipt = await this.prisma.receipt.findUnique({ where: { id }, include: RECEIPT_INCLUDE });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return toView(receipt);
  }

  async create(dto: CreateReceiptDto, userId: string): Promise<ReceiptView> {
    await this.assertHeader(this.prisma, dto.supplierId, dto.warehouseId, dto.locationId);
    await this.assertItems(this.prisma, dto.items);

    const receipt = await this.prisma.receipt.create({
      data: {
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
        receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
        createdBy: userId,
        updatedBy: userId,
        items: { create: dto.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) },
      },
      include: RECEIPT_INCLUDE,
    });
    return toView(receipt);
  }

  async update(id: string, dto: UpdateReceiptDto, userId: string): Promise<ReceiptView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockReceipt(tx, id);
      if (!EDITABLE.includes(current.status)) {
        throw new ConflictException(`Receipt ${current.reference} is ${current.status} and can no longer be edited`);
      }

      const supplierId = dto.supplierId ?? current.supplierId;
      const warehouseId = dto.warehouseId ?? current.warehouseId;
      const locationId = dto.locationId ?? current.locationId;
      await this.assertHeader(tx, supplierId, warehouseId, locationId);
      if (dto.items) await this.assertItems(tx, dto.items);

      await tx.receipt.update({
        where: { id },
        data: {
          supplierId,
          warehouseId,
          locationId,
          receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
          updatedBy: userId,
        },
      });
      if (dto.items) {
        await tx.receiptItem.deleteMany({ where: { receiptId: id } });
        await tx.receiptItem.createMany({
          data: dto.items.map((item) => ({ receiptId: id, productId: item.productId, quantity: item.quantity })),
        });
      }
    });
    return this.findOne(id);
  }

  /** DRAFT → WAITING: confirmed with the supplier, awaiting arrival */
  confirm(id: string, userId: string) {
    return this.transition(id, ['DRAFT'], 'WAITING', userId, 'confirmed');
  }

  /** WAITING → READY: goods have arrived and can be validated */
  markReady(id: string, userId: string) {
    return this.transition(id, ['WAITING'], 'READY', userId, 'marked ready');
  }

  /** Before any stock moved; a DONE receipt can't be canceled */
  cancel(id: string, userId: string) {
    return this.transition(id, CANCELABLE, 'CANCELED', userId, 'canceled');
  }

  /**
   * READY → DONE. One transaction: lock the receipt, re-check everything, increase stock for every
   * line (StockService writes the ledger), then mark it DONE. Any failure rolls all of it back.
   */
  async validate(id: string, userId: string): Promise<ReceiptView & { stockChanges: ReceiptStockChange[] }> {
    const stockChanges = await this.prisma.$transaction(async (tx) => {
      const current = await lockReceipt(tx, id);
      if (current.status === 'DONE') throw new ConflictException(`Receipt ${current.reference} has already been validated`);
      if (current.status !== 'READY') {
        throw new ConflictException(
          `Receipt ${current.reference} is ${current.status}. Only READY receipts can be validated.`,
        );
      }

      const receipt = await tx.receipt.findUniqueOrThrow({ where: { id }, include: RECEIPT_INCLUDE });
      if (receipt.items.length === 0) throw new BadRequestException('Receipt has no product lines');
      if (receipt.supplier.status !== 'ACTIVE') throw new BadRequestException(`Supplier ${receipt.supplier.name} is inactive`);

      // StockService re-checks that every product, the location and its warehouse are active
      const result = await this.stock.apply(
        tx,
        receipt.items.map((item) => ({
          type: 'INCREASE' as const,
          productId: item.productId,
          locationId: receipt.locationId,
          quantity: item.quantity,
        })),
        { operation: 'RECEIPT', referenceId: receipt.id, referenceCode: receipt.reference, performedBy: userId },
      );

      await tx.receipt.update({
        where: { id },
        data: { status: 'DONE', validatedBy: userId, validatedAt: new Date(), updatedBy: userId },
      });

      return receipt.items.map((item, index) => ({
        productId: item.productId,
        sku: item.product.sku,
        unitOfMeasure: item.product.unitOfMeasure,
        quantity: item.quantity.toNumber(),
        before: result.changes[index][0].before.toNumber(),
        after: result.changes[index][0].after.toNumber(),
      }));
    });

    return { ...(await this.findOne(id)), stockChanges };
  }

  // ---------------------------------------------------------------------------

  private async transition(
    id: string,
    from: DocumentStatus[],
    to: DocumentStatus,
    userId: string,
    verb: string,
  ): Promise<ReceiptView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockReceipt(tx, id);
      if (!from.includes(current.status)) {
        throw new ConflictException(`Receipt ${current.reference} is ${current.status} and can't be ${verb}`);
      }
      await tx.receipt.update({ where: { id }, data: { status: to, updatedBy: userId } });
    });
    return this.findOne(id);
  }

  /** Supplier active; warehouse active; location active and inside that warehouse */
  private async assertHeader(db: Tx, supplierId: string, warehouseId: string, locationId: string) {
    const [supplier, warehouse, location] = await Promise.all([
      db.supplier.findUnique({ where: { id: supplierId }, select: { name: true, status: true } }),
      db.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true, status: true } }),
      db.location.findUnique({ where: { id: locationId }, select: { name: true, status: true, warehouseId: true } }),
    ]);
    if (!supplier) throw new BadRequestException('Supplier not found');
    if (supplier.status !== 'ACTIVE') throw new BadRequestException(`Supplier ${supplier.name} is inactive`);
    if (!warehouse) throw new BadRequestException('Warehouse not found');
    if (warehouse.status !== 'ACTIVE') throw new BadRequestException(`Warehouse ${warehouse.name} is inactive`);
    if (!location) throw new BadRequestException('Location not found');
    if (location.warehouseId !== warehouseId) {
      throw new BadRequestException(`Location ${location.name} does not belong to ${warehouse.name}`);
    }
    if (location.status !== 'ACTIVE') throw new BadRequestException(`Location ${location.name} is inactive`);
  }

  /** One line per product; every product must exist and be active */
  private async assertItems(db: Tx, items: ReceiptItemDto[]) {
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
}

/** Row lock on the receipt so concurrent edits / transitions / validations serialize */
async function lockReceipt(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<
    { reference: string; status: DocumentStatus; supplier_id: string; warehouse_id: string; location_id: string }[]
  >`SELECT reference, status, supplier_id, warehouse_id, location_id FROM receipts WHERE id = ${id}::uuid FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException('Receipt not found');
  const row = rows[0];
  return {
    reference: row.reference,
    status: row.status,
    supplierId: row.supplier_id,
    warehouseId: row.warehouse_id,
    locationId: row.location_id,
  };
}

function buildWhere(filters: ReceiptFiltersDto): Prisma.ReceiptWhereInput {
  const receiptDate: Prisma.DateTimeFilter = {};
  if (filters.dateFrom) receiptDate.gte = startOfDay(filters.dateFrom);
  if (filters.dateTo) receiptDate.lt = new Date(startOfDay(filters.dateTo).getTime() + 86_400_000);

  return {
    status: filters.status,
    supplierId: filters.supplierId,
    warehouseId: filters.warehouseId,
    locationId: filters.locationId,
    receiptDate: filters.dateFrom || filters.dateTo ? receiptDate : undefined,
    OR: filters.search
      ? [
          { reference: { contains: filters.search, mode: 'insensitive' } },
          { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
        ]
      : undefined,
  };
}

function startOfDay(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

function toView(receipt: ReceiptWithRelations): ReceiptView {
  const items = receipt.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    sku: item.product.sku,
    unitOfMeasure: item.product.unitOfMeasure,
    quantity: item.quantity.toNumber(),
  }));
  return {
    id: receipt.id,
    reference: receipt.reference,
    status: receipt.status,
    receiptDate: receipt.receiptDate,
    supplier: receipt.supplier,
    warehouse: receipt.warehouse,
    location: receipt.location,
    items,
    lineCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    createdBy: receipt.createdByUser,
    validatedBy: receipt.validatedByUser,
    validatedAt: receipt.validatedAt,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
