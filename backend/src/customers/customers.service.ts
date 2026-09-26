import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors.js';
import type { RecordStatus, Customer } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto.js';

export interface CustomerView {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  status: RecordStatus;
  deliveryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CustomerQueryDto): Promise<CustomerView[]> {
    const customers = await this.prisma.customer.findMany({
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
      include: { _count: { select: { deliveries: true } } },
    });
    return customers.map((customer) => toView(customer, customer._count.deliveries));
  }

  async findOne(id: string): Promise<CustomerView> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { deliveries: true } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return toView(customer, customer._count.deliveries);
  }

  async create(dto: CreateCustomerDto): Promise<CustomerView> {
    const code = dto.code || null;
    if (code) await this.assertCodeAvailable(code);
    try {
      const customer = await this.prisma.customer.create({
        data: { name: dto.name, code, email: dto.email || null, phone: dto.phone || null },
      });
      return toView(customer, 0);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`Customer code ${code} already exists`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerView> {
    const existing = await this.prisma.customer.findUnique({ where: { id }, select: { code: true } });
    if (!existing) throw new NotFoundException('Customer not found');
    const code = dto.code === undefined ? undefined : dto.code || null;
    if (code && code !== existing.code) await this.assertCodeAvailable(code);

    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          name: dto.name,
          code,
          email: dto.email === undefined ? undefined : dto.email || null,
          phone: dto.phone === undefined ? undefined : dto.phone || null,
        },
        include: { _count: { select: { deliveries: true } } },
      });
      return toView(customer, customer._count.deliveries);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`Customer code ${code} already exists`);
      throw error;
    }
  }

  /** Customers are deactivated, never deleted (deliveries keep referencing them) */
  async setStatus(id: string, status: RecordStatus): Promise<CustomerView> {
    const existing = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Customer not found');
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { status },
      include: { _count: { select: { deliveries: true } } },
    });
    return toView(customer, customer._count.deliveries);
  }

  private async assertCodeAvailable(code: string) {
    const clash = await this.prisma.customer.findUnique({ where: { code }, select: { id: true } });
    if (clash) throw new ConflictException(`Customer code ${code} already exists`);
  }
}

function toView(customer: Customer, deliveryCount: number): CustomerView {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    deliveryCount,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
