import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors.js';
import type { Prisma, RecordStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AllLocationsQueryDto,
  CreateLocationDto,
  LocationQueryDto,
  UpdateLocationDto,
} from './dto/warehouse.dto.js';
import { locationHoldsStock, productCountsByLocation } from './warehouse-stock.js';

export interface LocationView {
  id: string;
  name: string;
  code: string;
  status: RecordStatus;
  warehouse: { id: string; name: string; code: string; status: RecordStatus };
  /** Distinct products currently stocked here */
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const LOCATION_INCLUDE = {
  warehouse: { select: { id: true, name: true, code: true, status: true } },
} satisfies Prisma.LocationInclude;

type LocationWithWarehouse = Prisma.LocationGetPayload<{ include: typeof LOCATION_INCLUDE }>;

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Locations of one warehouse */
  async listForWarehouse(warehouseId: string, query: LocationQueryDto): Promise<LocationView[]> {
    await this.findWarehouseOrThrow(warehouseId);
    return this.list({ ...query, warehouseId });
  }

  /** Locations across all warehouses (for pickers and filters) */
  async list(query: AllLocationsQueryDto): Promise<LocationView[]> {
    const locations = await this.prisma.location.findMany({
      where: {
        warehouseId: query.warehouseId,
        status: query.status,
        OR: query.search
          ? [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: LOCATION_INCLUDE,
      orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
    });
    return this.toViews(locations);
  }

  async findOne(id: string): Promise<LocationView> {
    const location = await this.prisma.location.findUnique({ where: { id }, include: LOCATION_INCLUDE });
    if (!location) throw new NotFoundException('Location not found');
    return (await this.toViews([location]))[0];
  }

  async create(warehouseId: string, dto: CreateLocationDto): Promise<LocationView> {
    const warehouse = await this.findWarehouseOrThrow(warehouseId);
    if (warehouse.status !== 'ACTIVE') {
      throw new BadRequestException("Locations can't be added to an inactive warehouse");
    }
    await this.assertCodeAvailable(warehouseId, dto.code);

    try {
      const location = await this.prisma.location.create({
        data: { warehouseId, name: dto.name, code: dto.code },
        include: LOCATION_INCLUDE,
      });
      return (await this.toViews([location]))[0];
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(this.duplicateMessage(dto.code, warehouse.name));
      throw error;
    }
  }

  async update(id: string, dto: UpdateLocationDto): Promise<LocationView> {
    const existing = await this.prisma.location.findUnique({ where: { id }, include: LOCATION_INCLUDE });
    if (!existing) throw new NotFoundException('Location not found');
    if (dto.code !== undefined && dto.code !== existing.code) {
      await this.assertCodeAvailable(existing.warehouseId, dto.code, existing.warehouse.name);
    }

    try {
      const location = await this.prisma.location.update({
        where: { id },
        data: { name: dto.name, code: dto.code },
        include: LOCATION_INCLUDE,
      });
      return (await this.toViews([location]))[0];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(this.duplicateMessage(dto.code ?? existing.code, existing.warehouse.name));
      }
      throw error;
    }
  }

  /**
   * Locations are deactivated, never deleted (the ledger keeps referencing them).
   * A location holding stock can't be deactivated; one inside an inactive warehouse can't be activated.
   */
  async setStatus(id: string, status: RecordStatus): Promise<LocationView> {
    const existing = await this.prisma.location.findUnique({ where: { id }, include: LOCATION_INCLUDE });
    if (!existing) throw new NotFoundException('Location not found');

    if (status === 'INACTIVE' && (await locationHoldsStock(this.prisma, id))) {
      throw new ConflictException(
        'This location still holds stock. Transfer, deliver or adjust it out before deactivating the location.',
      );
    }
    if (status === 'ACTIVE' && existing.warehouse.status !== 'ACTIVE') {
      throw new BadRequestException('Activate the warehouse before activating its locations');
    }

    const location = await this.prisma.location.update({
      where: { id },
      data: { status },
      include: LOCATION_INCLUDE,
    });
    return (await this.toViews([location]))[0];
  }

  // ---------------------------------------------------------------------------

  private async findWarehouseOrThrow(warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, status: true },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  private async assertCodeAvailable(warehouseId: string, code: string, warehouseName?: string) {
    const clash = await this.prisma.location.findUnique({
      where: { warehouseId_code: { warehouseId, code } },
      select: { id: true, warehouse: { select: { name: true } } },
    });
    if (clash) throw new ConflictException(this.duplicateMessage(code, warehouseName ?? clash.warehouse.name));
  }

  private duplicateMessage(code: string, warehouseName: string) {
    return `Location code ${code} already exists in ${warehouseName}`;
  }

  private async toViews(locations: LocationWithWarehouse[]): Promise<LocationView[]> {
    const counts = await productCountsByLocation(
      this.prisma,
      locations.map((location) => location.id),
    );
    return locations.map((location) => ({
      id: location.id,
      name: location.name,
      code: location.code,
      status: location.status,
      warehouse: location.warehouse,
      productCount: counts.get(location.id) ?? 0,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    }));
  }
}
