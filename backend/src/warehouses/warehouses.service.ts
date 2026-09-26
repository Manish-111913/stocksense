import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { paginated, skipTake, type Paginated } from '../common/pagination.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { Prisma, type RecordStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  WarehouseQueryDto,
} from './dto/warehouse.dto.js';
import { productCountsByLocation, productCountsByWarehouse, warehouseHoldsStock } from './warehouse-stock.js';

export interface WarehouseLocationView {
  id: string;
  name: string;
  code: string;
  status: RecordStatus;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: RecordStatus;
  createdBy: { id: string; fullName: string };
  createdAt: Date;
  updatedAt: Date;
  locationCount: number;
  activeLocationCount: number;
  /** Distinct products currently stocked anywhere in this warehouse */
  productCount: number;
  locations: WarehouseLocationView[];
}

export interface WarehouseSummary {
  totalWarehouses: number;
  activeWarehouses: number;
  totalLocations: number;
  activeLocations: number;
  /** Distinct products stocked in any warehouse */
  storedProducts: number;
  /** Active warehouse holding the most distinct products (null when nothing is stocked) */
  topWarehouse: { id: string; name: string; code: string; productCount: number } | null;
}

const WAREHOUSE_INCLUDE = {
  createdByUser: { select: { id: true, fullName: true } },
  locations: { orderBy: [{ status: 'asc' }, { name: 'asc' }] },
} satisfies Prisma.WarehouseInclude;

type WarehouseWithRelations = Prisma.WarehouseGetPayload<{ include: typeof WAREHOUSE_INCLUDE }>;

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: WarehouseQueryDto): Promise<Paginated<WarehouseView>> {
    const where: Prisma.WarehouseWhereInput = {
      status: query.status,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        include: WAREHOUSE_INCLUDE,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        ...skipTake(query),
      }),
      this.prisma.warehouse.count({ where }),
    ]);
    return paginated(await this.toViews(warehouses), total, query.page, query.limit);
  }

  async summary(): Promise<WarehouseSummary> {
    const [totalWarehouses, activeWarehouses, totalLocations, activeLocations, stored, top] = await Promise.all([
      this.prisma.warehouse.count(),
      this.prisma.warehouse.count({ where: { status: 'ACTIVE' } }),
      this.prisma.location.count(),
      this.prisma.location.count({ where: { status: 'ACTIVE', warehouse: { status: 'ACTIVE' } } }),
      this.prisma.$queryRaw<{ products: number }[]>`
        SELECT count(DISTINCT product_id)::int AS products FROM stock WHERE quantity > 0`,
      this.prisma.$queryRaw<{ id: string; name: string; code: string; products: number }[]>`
        SELECT w.id, w.name, w.code, count(DISTINCT s.product_id)::int AS products
        FROM stock s
        JOIN locations l ON l.id = s.location_id
        JOIN warehouses w ON w.id = l.warehouse_id
        WHERE s.quantity > 0 AND w.status = 'ACTIVE'
        GROUP BY w.id, w.name, w.code
        ORDER BY products DESC, w.name ASC
        LIMIT 1`,
    ]);
    return {
      totalWarehouses,
      activeWarehouses,
      totalLocations,
      activeLocations,
      storedProducts: stored[0]?.products ?? 0,
      topWarehouse: top[0]
        ? { id: top[0].id, name: top[0].name, code: top[0].code, productCount: top[0].products }
        : null,
    };
  }

  async findOne(id: string): Promise<WarehouseView> {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id }, include: WAREHOUSE_INCLUDE });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    const [view] = await this.toViews([warehouse]);
    return view;
  }

  async create(dto: CreateWarehouseDto, userId: string): Promise<WarehouseView> {
    await this.assertCodeAvailable(dto.code);
    try {
      const warehouse = await this.prisma.warehouse.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description || null,
          createdBy: userId,
          updatedBy: userId,
        },
        include: WAREHOUSE_INCLUDE,
      });
      const [view] = await this.toViews([warehouse]);
      return view;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`Warehouse code ${dto.code} already exists`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateWarehouseDto, userId: string): Promise<WarehouseView> {
    const existing = await this.prisma.warehouse.findUnique({ where: { id }, select: { code: true } });
    if (!existing) throw new NotFoundException('Warehouse not found');
    if (dto.code !== undefined && dto.code !== existing.code) await this.assertCodeAvailable(dto.code);

    try {
      const warehouse = await this.prisma.warehouse.update({
        where: { id },
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description === undefined ? undefined : dto.description || null,
          updatedBy: userId,
        },
        include: WAREHOUSE_INCLUDE,
      });
      return (await this.toViews([warehouse]))[0];
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`Warehouse code ${dto.code} already exists`);
      throw error;
    }
  }

  /** Warehouses are deactivated, never deleted; one that still holds stock can't be deactivated */
  async setStatus(id: string, status: RecordStatus, userId: string): Promise<WarehouseView> {
    const existing = await this.prisma.warehouse.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Warehouse not found');

    if (status === 'INACTIVE' && (await warehouseHoldsStock(this.prisma, id))) {
      throw new ConflictException(
        'This warehouse still holds stock. Transfer, deliver or adjust it out before deactivating the warehouse.',
      );
    }

    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { status, updatedBy: userId },
      include: WAREHOUSE_INCLUDE,
    });
    return (await this.toViews([warehouse]))[0];
  }

  // ---------------------------------------------------------------------------

  private async assertCodeAvailable(code: string) {
    const clash = await this.prisma.warehouse.findUnique({ where: { code }, select: { id: true } });
    if (clash) throw new ConflictException(`Warehouse code ${code} already exists`);
  }

  private async toViews(warehouses: WarehouseWithRelations[]): Promise<WarehouseView[]> {
    const locationIds = warehouses.flatMap((warehouse) => warehouse.locations.map((location) => location.id));
    const [byWarehouse, byLocation] = await Promise.all([
      productCountsByWarehouse(this.prisma, warehouses.map((warehouse) => warehouse.id)),
      productCountsByLocation(this.prisma, locationIds),
    ]);

    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description,
      status: warehouse.status,
      createdBy: warehouse.createdByUser,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
      locationCount: warehouse.locations.length,
      activeLocationCount: warehouse.locations.filter((location) => location.status === 'ACTIVE').length,
      productCount: byWarehouse.get(warehouse.id) ?? 0,
      locations: warehouse.locations.map((location) => ({
        id: location.id,
        name: location.name,
        code: location.code,
        status: location.status,
        productCount: byLocation.get(location.id) ?? 0,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      })),
    }));
  }
}
