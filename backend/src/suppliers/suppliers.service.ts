import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors.js';
import type { RecordStatus, Supplier } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from './dto/supplier.dto.js';

export interface SupplierView {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  status: RecordStatus;
  receiptCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SupplierQueryDto): Promise<SupplierView[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        status: query.status,
        OR: query.search
          ? [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { receipts: true } } },
    });
    return suppliers.map((supplier) => toView(supplier, supplier._count.receipts));
  }

  async create(dto: CreateSupplierDto): Promise<SupplierView> {
    const code = dto.code || null;
    if (code) await this.assertCodeAvailable(code);
    try {
      const supplier = await this.prisma.supplier.create({
        data: { name: dto.name, code, email: dto.email || null, phone: dto.phone || null },
      });
      return toView(supplier, 0);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`Supplier code ${code} already exists`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierView> {
    const existing = await this.prisma.supplier.findUnique({ where: { id }, select: { code: true } });
    if (!existing) throw new NotFoundException('Supplier not found');
    const code = dto.code === undefined ? undefined : dto.code || null;
    if (code && code !== existing.code) await this.assertCodeAvailable(code);

    try {
      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: {
          name: dto.name,
          code,
          email: dto.email === undefined ? undefined : dto.email || null,
          phone: dto.phone === undefined ? undefined : dto.phone || null,
        },
        include: { _count: { select: { receipts: true } } },
      });
      return toView(supplier, supplier._count.receipts);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`Supplier code ${code} already exists`);
      throw error;
    }
  }

  /** Suppliers are deactivated, never deleted (receipts keep referencing them) */
  async setStatus(id: string, status: RecordStatus): Promise<SupplierView> {
    const existing = await this.prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Supplier not found');
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { status },
      include: { _count: { select: { receipts: true } } },
    });
    return toView(supplier, supplier._count.receipts);
  }

  private async assertCodeAvailable(code: string) {
    const clash = await this.prisma.supplier.findUnique({ where: { code }, select: { id: true } });
    if (clash) throw new ConflictException(`Supplier code ${code} already exists`);
  }
}

function toView(supplier: Supplier, receiptCount: number): SupplierView {
  return {
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    email: supplier.email,
    phone: supplier.phone,
    status: supplier.status,
    receiptCount,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}
