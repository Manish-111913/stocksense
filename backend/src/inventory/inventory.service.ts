import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { paginated, type Paginated, type PaginationQueryDto } from '../common/pagination.js';
import { Prisma, type RecordStatus } from '../generated/prisma/client.js';
import { stockStatusFor } from '../products/products.service.js';
import type { StockStatus } from '../products/dto/product.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { InventoryQueryDto } from './dto/inventory.dto.js';
import { StockService } from './stock.service.js';

/** One stock position: a product at a location */
export interface StockPosition {
  stockId: string;
  quantity: number;
  version: number;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
    unitOfMeasure: string;
    reorderLevel: number;
    status: RecordStatus;
    category: { id: string; name: string };
    totalQuantity: number;
    stockStatus: StockStatus;
  };
  location: { id: string; name: string; code: string; status: RecordStatus };
  warehouse: { id: string; name: string; code: string; status: RecordStatus };
}

export interface ProductStockLevel {
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  category: string;
  currentQuantity: number;
  reorderLevel: number;
  status: StockStatus;
}

const POSITION_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      unitOfMeasure: true,
      reorderLevel: true,
      status: true,
      category: { select: { id: true, name: true } },
    },
  },
  location: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      warehouse: { select: { id: true, name: true, code: true, status: true } },
    },
  },
} satisfies Prisma.StockInclude;

type StockWithRelations = Prisma.StockGetPayload<{ include: typeof POSITION_INCLUDE }>;

/** Read side of inventory. Stock itself only changes through StockService.apply() */
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  /** Stock positions (quantity > 0 unless `outOfStock`), newest movement first */
  async list(query: InventoryQueryDto): Promise<Paginated<StockPosition>> {
    const productWhere: Prisma.ProductWhereInput = {
      categoryId: query.categoryId,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    if (query.lowStock || query.outOfStock) {
      const ids = await this.productIdsWithStatus(query.outOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK');
      productWhere.id = { in: ids };
    }

    const where: Prisma.StockWhereInput = {
      productId: query.productId,
      locationId: query.locationId,
      location: query.warehouseId ? { warehouseId: query.warehouseId } : undefined,
      quantity: query.outOfStock ? { equals: 0 } : { gt: 0 },
      product: productWhere,
    };

    const [rows, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        include: POSITION_INCLUDE,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.stock.count({ where }),
    ]);
    const totals = await this.productTotals(rows.map((row) => row.productId));
    return paginated(rows.map((row) => toPosition(row, totals)), total, query.page, query.limit);
  }

  async productStock(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, unitOfMeasure: true, reorderLevel: true, status: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const rows = await this.prisma.stock.findMany({
      where: { productId, quantity: { gt: 0 } },
      include: POSITION_INCLUDE,
      orderBy: { quantity: 'desc' },
    });
    const totalQuantity = sum(rows);
    const reorderLevel = product.reorderLevel.toNumber();
    return {
      product: { ...product, reorderLevel },
      totalQuantity,
      stockStatus: stockStatusFor(totalQuantity, reorderLevel),
      locations: rows.map((row) => ({
        locationId: row.location.id,
        locationName: row.location.name,
        locationCode: row.location.code,
        warehouseId: row.location.warehouse.id,
        warehouseName: row.location.warehouse.name,
        quantity: row.quantity.toNumber(),
        version: row.version,
        updatedAt: row.updatedAt,
      })),
    };
  }

  async locationStock(locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        warehouse: { select: { id: true, name: true, code: true, status: true } },
      },
    });
    if (!location) throw new NotFoundException('Location not found');

    const rows = await this.prisma.stock.findMany({
      where: { locationId, quantity: { gt: 0 } },
      include: POSITION_INCLUDE,
      orderBy: { product: { name: 'asc' } },
    });
    return {
      location,
      productCount: rows.length,
      products: rows.map((row) => ({
        productId: row.product.id,
        name: row.product.name,
        sku: row.product.sku,
        unitOfMeasure: row.product.unitOfMeasure,
        quantity: row.quantity.toNumber(),
        version: row.version,
        updatedAt: row.updatedAt,
      })),
    };
  }

  async warehouseStock(warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, code: true, status: true },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const rows = await this.prisma.stock.findMany({
      where: { quantity: { gt: 0 }, location: { warehouseId } },
      include: POSITION_INCLUDE,
      orderBy: [{ location: { name: 'asc' } }, { product: { name: 'asc' } }],
    });
    return {
      warehouse,
      productCount: new Set(rows.map((row) => row.productId)).size,
      positions: rows.map((row) => ({
        productId: row.product.id,
        name: row.product.name,
        sku: row.product.sku,
        unitOfMeasure: row.product.unitOfMeasure,
        locationId: row.location.id,
        locationName: row.location.name,
        locationCode: row.location.code,
        quantity: row.quantity.toNumber(),
        version: row.version,
        updatedAt: row.updatedAt,
      })),
    };
  }

  /** Active products with 0 < total stock ≤ reorder level */
  lowStock(query: PaginationQueryDto) {
    return this.stockLevels('LOW_STOCK', query);
  }

  /** Active products with no stock anywhere */
  outOfStock(query: PaginationQueryDto) {
    return this.stockLevels('OUT_OF_STOCK', query);
  }

  /** Quantity + version at one location: what a delivery can take, or the basis for an adjustment */
  async available(productId: string, locationId: string) {
    const [product, location] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: productId }, select: { id: true, unitOfMeasure: true } }),
      this.prisma.location.findUnique({ where: { id: locationId }, select: { id: true } }),
    ]);
    if (!product) throw new BadRequestException('Product not found');
    if (!location) throw new BadRequestException('Location not found');
    const { quantity, version } = await this.stock.getAvailable(this.prisma, productId, locationId);
    return { productId, locationId, unitOfMeasure: product.unitOfMeasure, quantity: quantity.toNumber(), version };
  }

  // ---------------------------------------------------------------------------

  private async stockLevels(status: 'LOW_STOCK' | 'OUT_OF_STOCK', query: PaginationQueryDto): Promise<Paginated<ProductStockLevel>> {
    const condition =
      status === 'OUT_OF_STOCK'
        ? Prisma.sql`t.qty = 0`
        : Prisma.sql`t.qty > 0 AND t.qty <= t.reorder_level`;

    const base = Prisma.sql`
      FROM (
        SELECT p.id, p.name, p.sku, p.unit_of_measure, p.reorder_level, c.name AS category,
               COALESCE(SUM(s.quantity), 0) AS qty
        FROM products p
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN stock s ON s.product_id = p.id
        WHERE p.status = 'ACTIVE'
        GROUP BY p.id, c.name
      ) t
      WHERE ${condition}`;

    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          name: string;
          sku: string;
          unit_of_measure: string;
          reorder_level: Prisma.Decimal | string;
          category: string;
          qty: Prisma.Decimal | string;
        }[]
      >`SELECT t.* ${base} ORDER BY (t.qty / NULLIF(t.reorder_level, 0)) ASC NULLS FIRST, t.name ASC
        LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      this.prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${base}`,
    ]);

    return paginated(
      rows.map((row) => ({
        productId: row.id,
        productName: row.name,
        sku: row.sku,
        unitOfMeasure: row.unit_of_measure,
        category: row.category,
        currentQuantity: new Prisma.Decimal(row.qty).toNumber(),
        reorderLevel: new Prisma.Decimal(row.reorder_level).toNumber(),
        status,
      })),
      counted[0]?.total ?? 0,
      query.page,
      query.limit,
    );
  }

  private async productIdsWithStatus(status: 'LOW_STOCK' | 'OUT_OF_STOCK'): Promise<string[]> {
    const condition =
      status === 'OUT_OF_STOCK'
        ? Prisma.sql`COALESCE(s.qty, 0) = 0`
        : Prisma.sql`COALESCE(s.qty, 0) > 0 AND COALESCE(s.qty, 0) <= p.reorder_level`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      LEFT JOIN (SELECT product_id, SUM(quantity) AS qty FROM stock GROUP BY product_id) s ON s.product_id = p.id
      WHERE ${condition}`;
    return rows.map((row) => row.id);
  }

  /** Total stock per product across all locations */
  private async productTotals(productIds: string[]) {
    if (productIds.length === 0) return new Map<string, number>();
    const rows = await this.prisma.stock.groupBy({
      by: ['productId'],
      where: { productId: { in: [...new Set(productIds)] } },
      _sum: { quantity: true },
    });
    return new Map(rows.map((row) => [row.productId, row._sum.quantity?.toNumber() ?? 0]));
  }
}

function sum(rows: StockWithRelations[]) {
  return rows.reduce((total, row) => total + row.quantity.toNumber(), 0);
}

function toPosition(row: StockWithRelations, totals: Map<string, number>): StockPosition {
  const totalQuantity = totals.get(row.productId) ?? 0;
  const reorderLevel = row.product.reorderLevel.toNumber();
  return {
    stockId: row.id,
    quantity: row.quantity.toNumber(),
    version: row.version,
    updatedAt: row.updatedAt,
    product: {
      id: row.product.id,
      name: row.product.name,
      sku: row.product.sku,
      unitOfMeasure: row.product.unitOfMeasure,
      reorderLevel,
      status: row.product.status,
      category: row.product.category,
      totalQuantity,
      stockStatus: stockStatusFor(totalQuantity, reorderLevel),
    },
    location: { id: row.location.id, name: row.location.name, code: row.location.code, status: row.location.status },
    warehouse: row.location.warehouse,
  };
}
