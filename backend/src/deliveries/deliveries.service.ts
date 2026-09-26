import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { paginated, skipTake, type Paginated } from '../common/pagination.js';
import { DocumentStatus, Prisma } from '../generated/prisma/client.js';
import { StockService } from '../inventory/stock.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateDeliveryDto,
  DeliveryFiltersDto,
  DeliveryItemDto,
  DeliveryQueryDto,
  UpdateDeliveryDto,
} from './dto/delivery.dto.js';

type Tx = Prisma.TransactionClient;
type UserRef = { id: string; fullName: string };

export interface DeliveryItemView {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  quantity: number;
  /** Current stock at the source location (advisory; the authoritative check happens at validation) */
  available: number;
  shortage: number;
}

export interface DeliveryView {
  id: string;
  reference: string;
  status: DocumentStatus;
  deliveryDate: Date;
  customer: { id: string; name: string; code: string | null; status: string };
  warehouse: { id: string; name: string; code: string };
  sourceLocation: { id: string; name: string; code: string };
  items: DeliveryItemView[];
  lineCount: number;
  totalQuantity: number;
  /** Every line currently has enough stock at the source location */
  isAvailable: boolean;
  picked: { by: UserRef; at: Date } | null;
  packed: { by: UserRef; at: Date } | null;
  createdBy: UserRef;
  validatedBy: UserRef | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryStockChange {
  productId: string;
  sku: string;
  unitOfMeasure: string;
  quantity: number;
  before: number;
  after: number;
}

export type DeliverySummary = Record<DocumentStatus, number> & { total: number };

const DELIVERY_INCLUDE = {
  customer: { select: { id: true, name: true, code: true, status: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  sourceLocation: { select: { id: true, name: true, code: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
  },
  createdByUser: { select: { id: true, fullName: true } },
  pickedByUser: { select: { id: true, fullName: true } },
  packedByUser: { select: { id: true, fullName: true } },
  validatedByUser: { select: { id: true, fullName: true } },
} satisfies Prisma.DeliveryInclude;

type DeliveryWithRelations = Prisma.DeliveryGetPayload<{ include: typeof DELIVERY_INCLUDE }>;

const EDITABLE: DocumentStatus[] = ['DRAFT', 'WAITING'];
const CANCELABLE: DocumentStatus[] = ['DRAFT', 'WAITING', 'READY'];
const EXPORT_LIMIT = 5000;

/**
 * Deliveries: outgoing stock to customers.
 * DRAFT →confirm→ READY (stock available now) or WAITING (not enough stock yet)
 * WAITING →check-availability→ READY; READY →pick→ →pack→ →validate→ DONE; DRAFT/WAITING/READY →cancel→ CANCELED.
 * Pick and pack only record who/when. Validation re-checks stock under row locks and decreases it
 * (StockService writes the ledger) in one transaction with the status change.
 */
@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(query: DeliveryQueryDto): Promise<Paginated<DeliveryView>> {
    const where = buildWhere(query);
    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({ where, include: DELIVERY_INCLUDE, orderBy: { createdAt: 'desc' }, ...skipTake(query) }),
      this.prisma.delivery.count({ where }),
    ]);
    return paginated(await this.toViews(deliveries), total, query.page, query.limit);
  }

  async summary(): Promise<DeliverySummary> {
    const groups = await this.prisma.delivery.groupBy({ by: ['status'], _count: { _all: true } });
    const summary = { DRAFT: 0, WAITING: 0, READY: 0, DONE: 0, CANCELED: 0, total: 0 };
    for (const group of groups) {
      summary[group.status] = group._count._all;
      summary.total += group._count._all;
    }
    return summary;
  }

  async exportCsv(filters: DeliveryFiltersDto): Promise<string> {
    const deliveries = await this.prisma.delivery.findMany({
      where: buildWhere(filters),
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_LIMIT,
    });
    const header = ['Reference', 'Customer', 'Warehouse', 'Source Location', 'Delivery Date', 'Status', 'SKU', 'Product', 'Quantity', 'UOM'];
    const rows = deliveries.flatMap((delivery) =>
      delivery.items.map((item) => [
        delivery.reference,
        delivery.customer.name,
        delivery.warehouse.name,
        delivery.sourceLocation.name,
        delivery.deliveryDate.toISOString().slice(0, 10),
        delivery.status,
        item.product.sku,
        item.product.name,
        item.quantity.toString(),
        item.product.unitOfMeasure,
      ]),
    );
    return [header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
  }

  async findOne(id: string): Promise<DeliveryView> {
    const delivery = await this.prisma.delivery.findUnique({ where: { id }, include: DELIVERY_INCLUDE });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return (await this.toViews([delivery]))[0];
  }

  async create(dto: CreateDeliveryDto, userId: string): Promise<DeliveryView> {
    await this.assertHeader(this.prisma, dto.customerId, dto.warehouseId, dto.sourceLocationId);
    await this.assertItems(this.prisma, dto.items);

    const delivery = await this.prisma.delivery.create({
      data: {
        customerId: dto.customerId,
        warehouseId: dto.warehouseId,
        sourceLocationId: dto.sourceLocationId,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        createdBy: userId,
        updatedBy: userId,
        items: { create: dto.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) },
      },
      include: DELIVERY_INCLUDE,
    });
    return (await this.toViews([delivery]))[0];
  }

  async update(id: string, dto: UpdateDeliveryDto, userId: string): Promise<DeliveryView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockDelivery(tx, id);
      if (!EDITABLE.includes(current.status)) {
        throw new ConflictException(`Delivery ${current.reference} is ${current.status} and can no longer be edited`);
      }

      const customerId = dto.customerId ?? current.customerId;
      const warehouseId = dto.warehouseId ?? current.warehouseId;
      const sourceLocationId = dto.sourceLocationId ?? current.sourceLocationId;
      await this.assertHeader(tx, customerId, warehouseId, sourceLocationId);
      if (dto.items) await this.assertItems(tx, dto.items);

      await tx.delivery.update({
        where: { id },
        data: {
          customerId,
          warehouseId,
          sourceLocationId,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
          updatedBy: userId,
        },
      });
      if (dto.items) {
        await tx.deliveryItem.deleteMany({ where: { deliveryId: id } });
        await tx.deliveryItem.createMany({
          data: dto.items.map((item) => ({ deliveryId: id, productId: item.productId, quantity: item.quantity })),
        });
      }
    });
    return this.findOne(id);
  }

  /** DRAFT → READY when every line is in stock at the source location now, otherwise WAITING */
  async confirm(id: string, userId: string): Promise<DeliveryView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockDelivery(tx, id);
      if (current.status !== 'DRAFT') {
        throw new ConflictException(`Delivery ${current.reference} is ${current.status} and can't be confirmed`);
      }
      const available = await this.linesAvailable(tx, id, current.sourceLocationId);
      await tx.delivery.update({ where: { id }, data: { status: available ? 'READY' : 'WAITING', updatedBy: userId } });
    });
    return this.findOne(id);
  }

  /** WAITING → READY once every line is in stock (stays WAITING otherwise) */
  async checkAvailability(id: string, userId: string): Promise<DeliveryView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockDelivery(tx, id);
      if (current.status !== 'WAITING') {
        throw new ConflictException(`Delivery ${current.reference} is ${current.status}; only WAITING deliveries are re-checked`);
      }
      if (await this.linesAvailable(tx, id, current.sourceLocationId)) {
        await tx.delivery.update({ where: { id }, data: { status: 'READY', updatedBy: userId } });
      }
    });
    return this.findOne(id);
  }

  /** Records the physical pick (READY deliveries). Stock doesn't change */
  async pick(id: string, userId: string): Promise<DeliveryView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockDelivery(tx, id);
      if (current.status !== 'READY') {
        throw new ConflictException(`Delivery ${current.reference} is ${current.status}; only READY deliveries can be picked`);
      }
      if (current.pickedAt) throw new ConflictException(`Delivery ${current.reference} has already been picked`);
      await tx.delivery.update({ where: { id }, data: { pickedBy: userId, pickedAt: new Date(), updatedBy: userId } });
    });
    return this.findOne(id);
  }

  /** Records packing (after picking). Stock doesn't change */
  async pack(id: string, userId: string): Promise<DeliveryView> {
    await this.prisma.$transaction(async (tx) => {
      const current = await lockDelivery(tx, id);
      if (current.status !== 'READY') {
        throw new ConflictException(`Delivery ${current.reference} is ${current.status}; only READY deliveries can be packed`);
      }
      if (!current.pickedAt) throw new ConflictException(`Delivery ${current.reference} must be picked before packing`);
      if (current.packedAt) throw new ConflictException(`Delivery ${current.reference} has already been packed`);
      await tx.delivery.update({ where: { id }, data: { packedBy: userId, packedAt: new Date(), updatedBy: userId } });
    });
    return this.findOne(id);
  }

  cancel(id: string, userId: string): Promise<DeliveryView> {
    return this.prisma
      .$transaction(async (tx) => {
        const current = await lockDelivery(tx, id);
        if (!CANCELABLE.includes(current.status)) {
          throw new ConflictException(`Delivery ${current.reference} is ${current.status} and can't be canceled`);
        }
        await tx.delivery.update({ where: { id }, data: { status: 'CANCELED', updatedBy: userId } });
      })
      .then(() => this.findOne(id));
  }

  /**
   * READY + picked + packed → DONE. One transaction: lock the delivery, re-check everything,
   * decrease stock for every line (StockService locks the stock rows and refuses to go below zero,
   * throwing INSUFFICIENT_STOCK), then mark it DONE. Any failure rolls all of it back.
   */
  async validate(id: string, userId: string): Promise<DeliveryView & { stockChanges: DeliveryStockChange[] }> {
    const stockChanges = await this.prisma.$transaction(async (tx) => {
      const current = await lockDelivery(tx, id);
      if (current.status === 'DONE') throw new ConflictException(`Delivery ${current.reference} has already been validated`);
      if (current.status !== 'READY') {
        throw new ConflictException(`Delivery ${current.reference} is ${current.status}. Only READY deliveries can be validated.`);
      }
      if (!current.pickedAt || !current.packedAt) {
        throw new ConflictException(`Delivery ${current.reference} must be picked and packed before validation`);
      }

      const delivery = await tx.delivery.findUniqueOrThrow({ where: { id }, include: DELIVERY_INCLUDE });
      if (delivery.items.length === 0) throw new BadRequestException('Delivery has no product lines');
      if (delivery.customer.status !== 'ACTIVE') throw new BadRequestException(`Customer ${delivery.customer.name} is inactive`);

      const result = await this.stock.apply(
        tx,
        delivery.items.map((item) => ({
          type: 'DECREASE' as const,
          productId: item.productId,
          locationId: delivery.sourceLocationId,
          quantity: item.quantity,
        })),
        { operation: 'DELIVERY', referenceId: delivery.id, referenceCode: delivery.reference, performedBy: userId },
      );

      await tx.delivery.update({
        where: { id },
        data: { status: 'DONE', validatedBy: userId, validatedAt: new Date(), updatedBy: userId },
      });

      return delivery.items.map((item, index) => ({
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

  private async linesAvailable(tx: Tx, deliveryId: string, locationId: string) {
    const items = await tx.deliveryItem.findMany({ where: { deliveryId }, select: { productId: true, quantity: true } });
    if (items.length === 0) throw new BadRequestException('Delivery has no product lines');
    const stock = await stockAt(tx, locationId, items.map((item) => item.productId));
    return items.every((item) => (stock.get(item.productId) ?? 0) >= item.quantity.toNumber());
  }

  /** Customer active; warehouse active; source location active and inside that warehouse */
  private async assertHeader(db: Tx, customerId: string, warehouseId: string, locationId: string) {
    const [customer, warehouse, location] = await Promise.all([
      db.customer.findUnique({ where: { id: customerId }, select: { name: true, status: true } }),
      db.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true, status: true } }),
      db.location.findUnique({ where: { id: locationId }, select: { name: true, status: true, warehouseId: true } }),
    ]);
    if (!customer) throw new BadRequestException('Customer not found');
    if (customer.status !== 'ACTIVE') throw new BadRequestException(`Customer ${customer.name} is inactive`);
    if (!warehouse) throw new BadRequestException('Warehouse not found');
    if (warehouse.status !== 'ACTIVE') throw new BadRequestException(`Warehouse ${warehouse.name} is inactive`);
    if (!location) throw new BadRequestException('Location not found');
    if (location.warehouseId !== warehouseId) {
      throw new BadRequestException(`Location ${location.name} does not belong to ${warehouse.name}`);
    }
    if (location.status !== 'ACTIVE') throw new BadRequestException(`Location ${location.name} is inactive`);
  }

  private async assertItems(db: Tx, items: DeliveryItemDto[]) {
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

  private async toViews(deliveries: DeliveryWithRelations[]): Promise<DeliveryView[]> {
    // One stock lookup for all (location, product) pairs on the page
    const pairs = deliveries.flatMap((delivery) =>
      delivery.items.map((item) => ({ productId: item.productId, locationId: delivery.sourceLocationId })),
    );
    const rows = pairs.length
      ? await this.prisma.stock.findMany({
          where: { OR: pairs.map((pair) => ({ productId: pair.productId, locationId: pair.locationId })) },
          select: { productId: true, locationId: true, quantity: true },
        })
      : [];
    const stock = new Map(rows.map((row) => [`${row.productId}|${row.locationId}`, row.quantity.toNumber()]));
    return deliveries.map((delivery) => toView(delivery, stock));
  }
}

async function stockAt(tx: Tx, locationId: string, productIds: string[]) {
  const rows = await tx.stock.findMany({
    where: { locationId, productId: { in: productIds } },
    select: { productId: true, quantity: true },
  });
  return new Map(rows.map((row) => [row.productId, row.quantity.toNumber()]));
}

/** Row lock on the delivery so concurrent edits / steps / validations serialize */
async function lockDelivery(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<
    {
      reference: string;
      status: DocumentStatus;
      customer_id: string;
      warehouse_id: string;
      source_location_id: string;
      picked_at: Date | null;
      packed_at: Date | null;
    }[]
  >`SELECT reference, status, customer_id, warehouse_id, source_location_id, picked_at, packed_at
    FROM deliveries WHERE id = ${id}::uuid FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundException('Delivery not found');
  const row = rows[0];
  return {
    reference: row.reference,
    status: row.status,
    customerId: row.customer_id,
    warehouseId: row.warehouse_id,
    sourceLocationId: row.source_location_id,
    pickedAt: row.picked_at,
    packedAt: row.packed_at,
  };
}

function buildWhere(filters: DeliveryFiltersDto): Prisma.DeliveryWhereInput {
  const deliveryDate: Prisma.DateTimeFilter = {};
  if (filters.dateFrom) deliveryDate.gte = startOfDay(filters.dateFrom);
  if (filters.dateTo) deliveryDate.lt = new Date(startOfDay(filters.dateTo).getTime() + 86_400_000);

  return {
    status: filters.status,
    customerId: filters.customerId,
    warehouseId: filters.warehouseId,
    sourceLocationId: filters.sourceLocationId,
    deliveryDate: filters.dateFrom || filters.dateTo ? deliveryDate : undefined,
    OR: filters.search
      ? [
          { reference: { contains: filters.search, mode: 'insensitive' } },
          { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        ]
      : undefined,
  };
}

function startOfDay(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

function toView(delivery: DeliveryWithRelations, stock: Map<string, number>): DeliveryView {
  const items = delivery.items.map((item) => {
    const quantity = item.quantity.toNumber();
    const available = stock.get(`${item.productId}|${delivery.sourceLocationId}`) ?? 0;
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
    id: delivery.id,
    reference: delivery.reference,
    status: delivery.status,
    deliveryDate: delivery.deliveryDate,
    customer: delivery.customer,
    warehouse: delivery.warehouse,
    sourceLocation: delivery.sourceLocation,
    items,
    lineCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    isAvailable: items.length > 0 && items.every((item) => item.shortage === 0),
    picked: delivery.pickedByUser && delivery.pickedAt ? { by: delivery.pickedByUser, at: delivery.pickedAt } : null,
    packed: delivery.packedByUser && delivery.packedAt ? { by: delivery.packedByUser, at: delivery.packedAt } : null,
    createdBy: delivery.createdByUser,
    validatedBy: delivery.validatedByUser,
    validatedAt: delivery.validatedAt,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
