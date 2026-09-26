import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors.js';
import type { Category, RecordStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CategoryQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

export interface CategoryView {
  id: string;
  name: string;
  description: string | null;
  status: RecordStatus;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DUPLICATE_NAME = 'A category with this name already exists';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CategoryQueryDto): Promise<CategoryView[]> {
    const categories = await this.prisma.category.findMany({
      where: { status: query.status },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return categories.map((category) => toView(category, category._count.products));
  }

  async create(dto: CreateCategoryDto): Promise<CategoryView> {
    await this.assertNameAvailable(dto.name);
    try {
      const category = await this.prisma.category.create({
        data: { name: dto.name, description: dto.description || null },
      });
      return toView(category, 0);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(DUPLICATE_NAME);
      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryView> {
    await this.findOrThrow(id);
    if (dto.name !== undefined) await this.assertNameAvailable(dto.name, id);
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description === undefined ? undefined : dto.description || null,
        },
        include: { _count: { select: { products: true } } },
      });
      return toView(category, category._count.products);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(DUPLICATE_NAME);
      throw error;
    }
  }

  /** Categories are deactivated, never deleted, so existing products keep their category */
  async setStatus(id: string, status: RecordStatus): Promise<CategoryView> {
    await this.findOrThrow(id);
    const category = await this.prisma.category.update({
      where: { id },
      data: { status },
      include: { _count: { select: { products: true } } },
    });
    return toView(category, category._count.products);
  }

  private async findOrThrow(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /** Names are unique regardless of letter case ("Raw Materials" = "raw materials") */
  private async assertNameAvailable(name: string, exceptId?: string) {
    const clash = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, id: exceptId ? { not: exceptId } : undefined },
      select: { id: true },
    });
    if (clash) throw new ConflictException(DUPLICATE_NAME);
  }
}

function toView(category: Category, productCount: number): CategoryView {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    status: category.status,
    productCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
