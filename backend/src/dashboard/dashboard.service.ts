import { Injectable } from '@nestjs/common';

import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { paginated, PaginationQueryDto, type Paginated } from '../common/pagination.js';
import { Trim } from '../common/transforms.js';
import { DocumentStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const DOCUMENT_TYPES = ['RECEIPT', 'DELIVERY', 'INTERNAL_TRANSFER', 'ADJUSTMENT'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class OperationsQueryDto extends PaginationQueryDto {
  /** Matches reference, product name or SKU */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  /** Transfers match on source or destination */
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export interface DashboardSummary {
  /** Active products with stock > 0 */
  productsInStock: number;
  totalProducts: number;
  categories: number;
  warehouses: number;
  lowStock: number;
  outOfStock: number;
  /** Receipts not yet validated or canceled (DRAFT / WAITING / READY) */
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
  draftAdjustments: number;
}

/** One document line (a product on a receipt / delivery / transfer, or one adjustment) */
export interface OperationRow {
  documentType: DocumentType;
  documentId: string;
  reference: string;
  status: DocumentStatus;
  date: Date;
  createdAt: Date;
  product: { id: string; name: string; sku: string; unitOfMeasure: string };
  category: { id: string; name: string };
  /** Receipt / adjustment location, delivery / transfer source */
  location: { warehouseName: string; locationName: string };
  /** Transfers only */
  destination: { warehouseName: string; locationName: string } | null;
  /** Supplier (receipts) or customer (deliveries) */
  partner: string | null;
  /** Receipts/deliveries/transfers: line quantity; adjustments: signed difference */
  quantity: number;
}

const PENDING = Prisma.sql`status IN ('DRAFT', 'WAITING', 'READY')`;

/** Read-only aggregates over the operational tables (no separate analytics data) */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<DashboardSummary> {
    const [[stock], [counts]] = await Promise.all([
      this.prisma.$queryRaw<{ in_stock: number; total: number; low: number; out: number }[]>`
        SELECT count(*) FILTER (WHERE qty > 0)::int AS in_stock,
               count(*)::int AS total,
               count(*) FILTER (WHERE qty > 0 AND qty <= reorder_level)::int AS low,
               count(*) FILTER (WHERE qty = 0)::int AS out
        FROM (
          SELECT p.id, p.reorder_level, COALESCE(SUM(s.quantity), 0) AS qty
          FROM products p LEFT JOIN stock s ON s.product_id = p.id
          WHERE p.status = 'ACTIVE'
          GROUP BY p.id
        ) t`,
      this.prisma.$queryRaw<
        { categories: number; warehouses: number; receipts: number; deliveries: number; transfers: number; adjustments: number }[]
      >`
        SELECT (SELECT count(*) FROM categories WHERE status = 'ACTIVE')::int AS categories,
               (SELECT count(*) FROM warehouses WHERE status = 'ACTIVE')::int AS warehouses,
               (SELECT count(*) FROM receipts WHERE ${PENDING})::int AS receipts,
               (SELECT count(*) FROM deliveries WHERE ${PENDING})::int AS deliveries,
               (SELECT count(*) FROM internal_transfers WHERE ${PENDING})::int AS transfers,
               (SELECT count(*) FROM inventory_adjustments WHERE status = 'DRAFT')::int AS adjustments`,
    ]);
    return {
      productsInStock: stock.in_stock,
      totalProducts: stock.total,
      categories: counts.categories,
      warehouses: counts.warehouses,
      lowStock: stock.low,
      outOfStock: stock.out,
      pendingReceipts: counts.receipts,
      pendingDeliveries: counts.deliveries,
      scheduledTransfers: counts.transfers,
      draftAdjustments: counts.adjustments,
    };
  }

  /** Recent operation lines across all four document types, newest first */
  async operations(query: OperationsQueryDto): Promise<Paginated<OperationRow>> {
    const conditions: Prisma.Sql[] = [];
    if (query.documentType) conditions.push(Prisma.sql`ops.document_type = ${query.documentType}`);
    if (query.status) conditions.push(Prisma.sql`ops.status = ${query.status}::document_status`);
    if (query.categoryId) conditions.push(Prisma.sql`ops.category_id = ${query.categoryId}::uuid`);
    if (query.warehouseId) {
      conditions.push(Prisma.sql`(ops.warehouse_id = ${query.warehouseId}::uuid OR ops.destination_warehouse_id = ${query.warehouseId}::uuid)`);
    }
    if (query.locationId) {
      conditions.push(Prisma.sql`(ops.location_id = ${query.locationId}::uuid OR ops.destination_location_id = ${query.locationId}::uuid)`);
    }
    if (query.search) {
      const like = `%${query.search}%`;
      conditions.push(Prisma.sql`(ops.reference ILIKE ${like} OR ops.product_name ILIKE ${like} OR ops.sku ILIKE ${like})`);
    }
    const where = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

    const ops = Prisma.sql`
      SELECT 'RECEIPT' AS document_type, r.id AS document_id, r.reference, r.status, r.receipt_date AS doc_date, r.created_at,
             r.warehouse_id, r.location_id, NULL::uuid AS destination_warehouse_id, NULL::uuid AS destination_location_id,
             ri.product_id, ri.quantity, s.name AS partner
      FROM receipt_items ri JOIN receipts r ON r.id = ri.receipt_id JOIN suppliers s ON s.id = r.supplier_id
      UNION ALL
      SELECT 'DELIVERY', d.id, d.reference, d.status, d.delivery_date, d.created_at,
             d.warehouse_id, d.source_location_id, NULL::uuid, NULL::uuid,
             di.product_id, di.quantity, c.name
      FROM delivery_items di JOIN deliveries d ON d.id = di.delivery_id JOIN customers c ON c.id = d.customer_id
      UNION ALL
      SELECT 'INTERNAL_TRANSFER', t.id, t.reference, t.status, t.transfer_date, t.created_at,
             t.source_warehouse_id, t.source_location_id, t.destination_warehouse_id, t.destination_location_id,
             ti.product_id, ti.quantity, NULL
      FROM internal_transfer_items ti JOIN internal_transfers t ON t.id = ti.transfer_id
      UNION ALL
      SELECT 'ADJUSTMENT', a.id, a.reference, a.status, a.created_at, a.created_at,
             a.warehouse_id, a.location_id, NULL::uuid, NULL::uuid,
             a.product_id, a.difference, a.reason
      FROM inventory_adjustments a`;

    const joined = Prisma.sql`
      FROM (
        SELECT o.*, p.name AS product_name, p.sku, p.unit_of_measure, p.category_id, c.name AS category_name,
               w.name AS warehouse_name, l.name AS location_name, dw.name AS destination_warehouse_name, dl.name AS destination_location_name
        FROM (${ops}) o
        JOIN products p ON p.id = o.product_id
        JOIN categories c ON c.id = p.category_id
        JOIN warehouses w ON w.id = o.warehouse_id
        JOIN locations l ON l.id = o.location_id
        LEFT JOIN warehouses dw ON dw.id = o.destination_warehouse_id
        LEFT JOIN locations dl ON dl.id = o.destination_location_id
      ) ops
      ${where}`;

    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<
        {
          document_type: DocumentType;
          document_id: string;
          reference: string;
          status: DocumentStatus;
          doc_date: Date;
          created_at: Date;
          product_id: string;
          product_name: string;
          sku: string;
          unit_of_measure: string;
          category_id: string;
          category_name: string;
          warehouse_name: string;
          location_name: string;
          destination_warehouse_name: string | null;
          destination_location_name: string | null;
          partner: string | null;
          quantity: Prisma.Decimal | string;
        }[]
      >`SELECT ops.* ${joined} ORDER BY ops.created_at DESC, ops.reference DESC, ops.sku ASC
        LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      this.prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${joined}`,
    ]);

    return paginated(
      rows.map((row) => ({
        documentType: row.document_type,
        documentId: row.document_id,
        reference: row.reference,
        status: row.status,
        date: row.doc_date,
        createdAt: row.created_at,
        product: { id: row.product_id, name: row.product_name, sku: row.sku, unitOfMeasure: row.unit_of_measure },
        category: { id: row.category_id, name: row.category_name },
        location: { warehouseName: row.warehouse_name, locationName: row.location_name },
        destination:
          row.destination_location_name && row.destination_warehouse_name
            ? { warehouseName: row.destination_warehouse_name, locationName: row.destination_location_name }
            : null,
        partner: row.partner,
        quantity: new Prisma.Decimal(row.quantity).toNumber(),
      })),
      counted[0]?.total ?? 0,
      query.page,
      query.limit,
    );
  }
}
