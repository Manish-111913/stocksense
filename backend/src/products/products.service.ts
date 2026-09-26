import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdjustmentsService } from '../adjustments/adjustments.service.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { paginated, skipTake, type Paginated } from '../common/pagination.js';
import { Prisma, type RecordStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateProductDto,
  ProductFiltersDto,
  ProductQueryDto,
  StockStatus,
  UpdateProductDto,
} from './dto/product.dto.js';

export interface ProductStockLocation {
  locationId: string;
  locationName: string;
  locationCode: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface ProductView {
  id: string;
  name: string;
  sku: string;
  unitOfMeasure: string;
  reorderLevel: number;
  status: RecordStatus;
  category: { id: string; name: string; status: RecordStatus };
  createdBy: { id: string; fullName: string };
  createdAt: Date;
  updatedAt: Date;
  /** Read-only view of the `stock` table; only inventory operations change it */
  stock: {
    onHand: number;
    stockStatus: StockStatus;
    locationCount: number;
    locations: ProductStockLocation[];
  };
}

export interface ProductSummary {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  warehouses: number;
}

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, status: true } },
  createdByUser: { select: { id: true, fullName: true } },
  stocks: {
    where: { quantity: { gt: 0 } },
    orderBy: { quantity: 'desc' },
    include: {
      location: { select: { id: true, name: true, code: true, warehouse: { select: { id: true, name: true } } } },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

const EXPORT_LIMIT = 5000;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adjustments: AdjustmentsService,
  ) {}

  async list(query: ProductQueryDto): Promise<Paginated<ProductView>> {
    const where = await this.buildWhere(query);
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...skipTake(query),
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginated(products.map(toView), total, query.page, query.limit);
  }

  /** KPI counts for the Products page (active products only) */
  async summary(): Promise<ProductSummary> {
    const [row] = await this.prisma.$queryRaw<
      { total: number; in_stock: number; low_stock: number; out_of_stock: number }[]
    >`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE qty > reorder_level)::int AS in_stock,
             count(*) FILTER (WHERE qty > 0 AND qty <= reorder_level)::int AS low_stock,
             count(*) FILTER (WHERE qty = 0)::int AS out_of_stock
      FROM (
        SELECT p.id, p.reorder_level, COALESCE(SUM(s.quantity), 0) AS qty
        FROM products p
        LEFT JOIN stock s ON s.product_id = p.id
        WHERE p.status = 'ACTIVE'
        GROUP BY p.id
      ) totals`;
    const warehouses = await this.prisma.warehouse.count({ where: { status: 'ACTIVE' } });
    return {
      totalProducts: row.total,
      inStock: row.in_stock,
      lowStock: row.low_stock,
      outOfStock: row.out_of_stock,
      warehouses,
    };
  }

  async exportCsv(filters: ProductFiltersDto): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: await this.buildWhere(filters),
      include: PRODUCT_INCLUDE,
      orderBy: { name: 'asc' },
      take: EXPORT_LIMIT,
    });
    const header = ['SKU', 'Name', 'Category', 'UOM', 'Total Stock', 'Stock Status', 'Reorder Level', 'Status'];
    const rows = products.map(toView).map((p) => [
      p.sku,
      p.name,
      p.category.name,
      p.unitOfMeasure,
      String(p.stock.onHand),
      STOCK_STATUS_LABEL[p.stock.stockStatus],
      String(p.reorderLevel),
      p.status,
    ]);
    return [header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
  }

  async findOne(id: string): Promise<ProductView> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) throw new NotFoundException('Product not found');
    return toView(product);
  }

  async create(dto: CreateProductDto, userId: string): Promise<ProductView> {
    await this.assertActiveCategory(dto.categoryId);
    await this.assertSkuAvailable(dto.sku);
    try {
      // Product + optional opening stock commit together (stock goes through an adjustment + ledger)
      const productId = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name: dto.name,
            sku: dto.sku,
            categoryId: dto.categoryId,
            unitOfMeasure: dto.unitOfMeasure,
            reorderLevel: dto.reorderLevel ?? 0,
            createdBy: userId,
            updatedBy: userId,
          },
          select: { id: true },
        });
        if (dto.initialStock) {
          await this.adjustments.recordOpeningStock(tx, { productId: product.id, ...dto.initialStock }, userId);
        }
        return product.id;
      });
      return this.findOne(productId);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`SKU ${dto.sku} already exists`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto, userId: string): Promise<ProductView> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    if (dto.categoryId !== undefined && dto.categoryId !== existing.categoryId) {
      await this.assertActiveCategory(dto.categoryId);
    }
    if (dto.unitOfMeasure !== undefined && dto.unitOfMeasure !== existing.unitOfMeasure) {
      await this.assertNoStockHistory(id);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        unitOfMeasure: dto.unitOfMeasure,
        reorderLevel: dto.reorderLevel,
        updatedBy: userId,
      },
      include: PRODUCT_INCLUDE,
    });
    return toView(product);
  }

  /** Products are deactivated, never deleted, so history keeps its references; one holding stock can't be deactivated */
  async setStatus(id: string, status: RecordStatus, userId: string): Promise<ProductView> {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Product not found');
    if (status === 'INACTIVE') {
      const held = await this.prisma.stock.count({ where: { productId: id, quantity: { gt: 0 } } });
      if (held > 0) {
        throw new ConflictException(
          'This product still has stock. Deliver, transfer or adjust it to zero before deactivating the product.',
        );
      }
    }
    const product = await this.prisma.product.update({
      where: { id },
      data: { status, updatedBy: userId },
      include: PRODUCT_INCLUDE,
    });
    return toView(product);
  }

  // ---------------------------------------------------------------------------

  private async buildWhere(filters: ProductFiltersDto): Promise<Prisma.ProductWhereInput> {
    const and: Prisma.ProductWhereInput[] = [];

    if (filters.search) {
      and.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }
    if (filters.categoryId) and.push({ categoryId: filters.categoryId });
    if (filters.status) and.push({ status: filters.status });
    if (filters.warehouseId) {
      and.push({ stocks: { some: { quantity: { gt: 0 }, location: { warehouseId: filters.warehouseId } } } });
    }
    if (filters.stockStatus) {
      and.push({ id: { in: await this.idsWithStockStatus(filters.stockStatus) } });
    }

    return { AND: and };
  }

  /** Stock status depends on total stock vs reorder level, so it's resolved in SQL */
  private async idsWithStockStatus(stockStatus: StockStatus): Promise<string[]> {
    const condition = {
      OUT_OF_STOCK: Prisma.sql`COALESCE(s.qty, 0) = 0`,
      LOW_STOCK: Prisma.sql`COALESCE(s.qty, 0) > 0 AND COALESCE(s.qty, 0) <= p.reorder_level`,
      IN_STOCK: Prisma.sql`COALESCE(s.qty, 0) > p.reorder_level`,
    }[stockStatus];

    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      LEFT JOIN (SELECT product_id, SUM(quantity) AS qty FROM stock GROUP BY product_id) s ON s.product_id = p.id
      WHERE ${condition}`;
    return rows.map((row) => row.id);
  }

  private async assertActiveCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { status: true } });
    if (!category) throw new BadRequestException('Category not found');
    if (category.status !== 'ACTIVE') throw new BadRequestException('Category is inactive');
  }

  private async assertSkuAvailable(sku: string) {
    const clash = await this.prisma.product.findUnique({ where: { sku }, select: { id: true } });
    if (clash) throw new ConflictException(`SKU ${sku} already exists`);
  }

  /** Changing the unit after stock has moved would change the meaning of recorded quantities */
  private async assertNoStockHistory(productId: string) {
    const [stockRows, ledgerRows] = await Promise.all([
      this.prisma.stock.count({ where: { productId } }),
      this.prisma.stockLedger.count({ where: { productId } }),
    ]);
    if (stockRows > 0 || ledgerRows > 0) {
      throw new ConflictException("Unit of measure can't be changed after stock has been recorded for this product");
    }
  }
}

const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
};

export function stockStatusFor(onHand: number, reorderLevel: number): StockStatus {
  if (onHand <= 0) return 'OUT_OF_STOCK';
  if (onHand <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function toView(product: ProductWithRelations): ProductView {
  const locations = product.stocks.map((stock) => ({
    locationId: stock.location.id,
    locationName: stock.location.name,
    locationCode: stock.location.code,
    warehouseId: stock.location.warehouse.id,
    warehouseName: stock.location.warehouse.name,
    quantity: stock.quantity.toNumber(),
  }));
  const onHand = locations.reduce((sum, location) => sum + location.quantity, 0);
  const reorderLevel = product.reorderLevel.toNumber();

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    unitOfMeasure: product.unitOfMeasure,
    reorderLevel,
    status: product.status,
    category: product.category,
    createdBy: product.createdByUser,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    stock: {
      onHand,
      stockStatus: stockStatusFor(onHand, reorderLevel),
      locationCount: locations.length,
      locations,
    },
  };
}

function csvCell(value: string): string {
  // Quote when needed, and neutralise spreadsheet formula injection
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
