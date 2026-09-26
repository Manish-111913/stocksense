import { Injectable } from '@nestjs/common';
import { dateBounds } from '../common/date-range.js';
import { paginated, type Paginated } from '../common/pagination.js';
import { DocumentStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  DashboardFiltersDto,
  DocumentType,
  OperationsQueryDto,
  StockAlertsQueryDto,
  StockScopeDto,
} from './dto/dashboard-query.dto.js';

export interface InventorySummary {
  /** Distinct active products with stock > 0 in the scope */
  totalProductsInStock: number;
  /** Active products (in the category filter) */
  totalProducts: number;
  /** 0 < stock <= reorder level */
  lowStock: number;
  /** stock = 0 */
  outOfStock: number;
}

export interface OperationsSummary {
  /** DRAFT / WAITING / READY (narrowed to the status filter when it is one of these) */
  pendingReceipts: number;
  pendingDeliveries: number;
  internalTransfersScheduled: number;
  pendingAdjustments: number;
}

export interface DashboardSummary extends InventorySummary, OperationsSummary {
  /** Active categories / warehouses (not filtered) */
  categories: number;
  warehouses: number;
}

export interface DashboardView {
  summary: DashboardSummary;
  /** The filters that were applied (null = not set) */
  filters: {
    documentType: DocumentType | null;
    status: DocumentStatus | null;
    warehouseId: string | null;
    locationId: string | null;
    categoryId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
  };
}

export interface StockAlert {
  product: { id: string; name: string; sku: string; unitOfMeasure: string };
  category: { id: string; name: string };
  reorderLevel: number;
  /** Summed over the warehouse / location scope */
  quantity: number;
  status: 'LOW_STOCK' | 'OUT_OF_STOCK';
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
  /** Supplier (receipts), customer (deliveries) or reason (adjustments) */
  partner: string | null;
  /** Receipts/deliveries/transfers: line quantity; adjustments: signed difference */
  quantity: number;
}

type Condition = Prisma.Sql | false | undefined | null | '';

const PENDING_STATUSES: DocumentStatus[] = ['DRAFT', 'WAITING', 'READY'];

/**
 * Read-only aggregation over the real tables (products, stock, documents). The dashboard keeps no numbers of
 * its own, so it can never drift from inventory. Filters apply where they mean something:
 * - stock KPIs / alerts: warehouse, location, category
 * - pending-document KPIs: warehouse, location, category, status, date range
 * - operations list: all of them, plus document type and search
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(filters: DashboardFiltersDto): Promise<DashboardView> {
    const [inventory, operations, [counts]] = await Promise.all([
      this.inventorySummary(filters),
      this.operationsSummary(filters),
      this.prisma.$queryRaw<{ categories: number; warehouses: number }[]>`
        SELECT (SELECT count(*) FROM categories WHERE status = 'ACTIVE')::int AS categories,
               (SELECT count(*) FROM warehouses WHERE status = 'ACTIVE')::int AS warehouses`,
    ]);
    return {
      summary: { ...inventory, ...operations, categories: counts.categories, warehouses: counts.warehouses },
      filters: {
        documentType: filters.documentType ?? null,
        status: filters.status ?? null,
        warehouseId: filters.warehouseId ?? null,
        locationId: filters.locationId ?? null,
        categoryId: filters.categoryId ?? null,
        dateFrom: filters.dateFrom ?? null,
        dateTo: filters.dateTo ?? null,
      },
    };
  }

  async inventorySummary(scope: StockScopeDto): Promise<InventorySummary> {
    const [row] = await this.prisma.$queryRaw<InventorySummary[]>`
      SELECT count(*) FILTER (WHERE qty > 0)::int AS "totalProductsInStock",
             count(*)::int AS "totalProducts",
             count(*) FILTER (WHERE qty > 0 AND qty <= reorder_level)::int AS "lowStock",
             count(*) FILTER (WHERE qty = 0)::int AS "outOfStock"
      FROM (${scopedProducts(scope)}) t`;
    return row;
  }

  async operationsSummary(filters: DashboardFiltersDto): Promise<OperationsSummary> {
    const statuses = filters.status ? PENDING_STATUSES.filter((s) => s === filters.status) : PENDING_STATUSES;
    if (statuses.length === 0) {
      // DONE / CANCELED documents are never pending
      return { pendingReceipts: 0, pendingDeliveries: 0, internalTransfersScheduled: 0, pendingAdjustments: 0 };
    }
    const status = (column: string) =>
      Prisma.sql`${Prisma.raw(column)} IN (${Prisma.join(statuses.map((s) => Prisma.sql`${s}::document_status`))})`;
    const { warehouseId: w, locationId: l, categoryId: c } = filters;

    const receipts: Condition[] = [
      status('r.status'),
      w && Prisma.sql`r.warehouse_id = ${w}::uuid`,
      l && Prisma.sql`r.location_id = ${l}::uuid`,
      ...dateConditions('r.receipt_date', filters),
      c && Prisma.sql`EXISTS (SELECT 1 FROM receipt_items i JOIN products p ON p.id = i.product_id WHERE i.receipt_id = r.id AND p.category_id = ${c}::uuid)`,
    ];
    const deliveries: Condition[] = [
      status('d.status'),
      w && Prisma.sql`d.warehouse_id = ${w}::uuid`,
      l && Prisma.sql`d.source_location_id = ${l}::uuid`,
      ...dateConditions('d.delivery_date', filters),
      c && Prisma.sql`EXISTS (SELECT 1 FROM delivery_items i JOIN products p ON p.id = i.product_id WHERE i.delivery_id = d.id AND p.category_id = ${c}::uuid)`,
    ];
    const transfers: Condition[] = [
      status('t.status'),
      w && Prisma.sql`(t.source_warehouse_id = ${w}::uuid OR t.destination_warehouse_id = ${w}::uuid)`,
      l && Prisma.sql`(t.source_location_id = ${l}::uuid OR t.destination_location_id = ${l}::uuid)`,
      ...dateConditions('t.transfer_date', filters),
      c && Prisma.sql`EXISTS (SELECT 1 FROM internal_transfer_items i JOIN products p ON p.id = i.product_id WHERE i.transfer_id = t.id AND p.category_id = ${c}::uuid)`,
    ];
    const adjustments: Condition[] = [
      status('a.status'),
      w && Prisma.sql`a.warehouse_id = ${w}::uuid`,
      l && Prisma.sql`a.location_id = ${l}::uuid`,
      ...dateConditions('a.created_at', filters),
      c && Prisma.sql`EXISTS (SELECT 1 FROM products p WHERE p.id = a.product_id AND p.category_id = ${c}::uuid)`,
    ];

    const [row] = await this.prisma.$queryRaw<OperationsSummary[]>`
      SELECT (SELECT count(*) FROM receipts r WHERE ${and(receipts)})::int AS "pendingReceipts",
             (SELECT count(*) FROM deliveries d WHERE ${and(deliveries)})::int AS "pendingDeliveries",
             (SELECT count(*) FROM internal_transfers t WHERE ${and(transfers)})::int AS "internalTransfersScheduled",
             (SELECT count(*) FROM inventory_adjustments a WHERE ${and(adjustments)})::int AS "pendingAdjustments"`;
    return row;
  }

  /** Low / out-of-stock products for the scope (the rows behind the lowStock / outOfStock KPIs), out of stock first */
  async stockAlerts(query: StockAlertsQueryDto): Promise<Paginated<StockAlert>> {
    const alerts = Prisma.sql`
      FROM (${scopedProducts(query)}) t
      JOIN categories c ON c.id = t.category_id
      WHERE t.qty = 0 OR t.qty <= t.reorder_level`;
    const [rows, [counted]] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          name: string;
          sku: string;
          unit_of_measure: string;
          reorder_level: Prisma.Decimal | string;
          qty: Prisma.Decimal | string;
          category_id: string;
          category_name: string;
        }[]
      >`SELECT t.id, t.name, t.sku, t.unit_of_measure, t.reorder_level, t.qty, t.category_id, c.name AS category_name ${alerts}
        ORDER BY (t.qty = 0) DESC, t.qty ASC, t.name ASC
        LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      this.prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${alerts}`,
    ]);
    return paginated(
      rows.map((row) => {
        const quantity = new Prisma.Decimal(row.qty).toNumber();
        return {
          product: { id: row.id, name: row.name, sku: row.sku, unitOfMeasure: row.unit_of_measure },
          category: { id: row.category_id, name: row.category_name },
          reorderLevel: new Prisma.Decimal(row.reorder_level).toNumber(),
          quantity,
          status: quantity === 0 ? ('OUT_OF_STOCK' as const) : ('LOW_STOCK' as const),
        };
      }),
      counted?.total ?? 0,
      query.page,
      query.limit,
    );
  }

  /** Recent operation lines across all four document types, newest first */
  async operations(query: OperationsQueryDto): Promise<Paginated<OperationRow>> {
    const like = query.search ? `%${query.search}%` : '';
    const where = and([
      query.documentType && Prisma.sql`ops.document_type = ${query.documentType}`,
      query.status && Prisma.sql`ops.status = ${query.status}::document_status`,
      query.categoryId && Prisma.sql`ops.category_id = ${query.categoryId}::uuid`,
      query.warehouseId &&
        Prisma.sql`(ops.warehouse_id = ${query.warehouseId}::uuid OR ops.destination_warehouse_id = ${query.warehouseId}::uuid)`,
      query.locationId &&
        Prisma.sql`(ops.location_id = ${query.locationId}::uuid OR ops.destination_location_id = ${query.locationId}::uuid)`,
      ...dateConditions('ops.doc_date', query),
      like && Prisma.sql`(ops.reference ILIKE ${like} OR ops.product_name ILIKE ${like} OR ops.sku ILIKE ${like})`,
    ]);

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
      WHERE ${where}`;

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

/** Active products (optionally in one category) with stock summed over the warehouse / location scope */
function scopedProducts(scope: StockScopeDto): Prisma.Sql {
  const inScope = and([
    scope.warehouseId && Prisma.sql`l.warehouse_id = ${scope.warehouseId}::uuid`,
    scope.locationId && Prisma.sql`s.location_id = ${scope.locationId}::uuid`,
  ]);
  return Prisma.sql`
    SELECT p.id, p.name, p.sku, p.unit_of_measure, p.reorder_level, p.category_id,
           COALESCE(SUM(s.quantity) FILTER (WHERE ${inScope}), 0) AS qty
    FROM products p
    LEFT JOIN stock s ON s.product_id = p.id
    LEFT JOIN locations l ON l.id = s.location_id
    WHERE p.status = 'ACTIVE' ${scope.categoryId ? Prisma.sql`AND p.category_id = ${scope.categoryId}::uuid` : Prisma.empty}
    GROUP BY p.id`;
}

function dateConditions(column: string, filters: { dateFrom?: string; dateTo?: string }): Condition[] {
  const bounds = dateBounds(filters.dateFrom, filters.dateTo);
  if (!bounds) return [];
  const col = Prisma.raw(column);
  return [
    bounds.gte && Prisma.sql`${col} >= ${bounds.gte}`,
    bounds.lt && Prisma.sql`${col} < ${bounds.lt}`,
    bounds.lte && Prisma.sql`${col} <= ${bounds.lte}`,
  ];
}

function and(conditions: Condition[]): Prisma.Sql {
  const present = conditions.filter((c): c is Prisma.Sql => Boolean(c));
  return present.length ? Prisma.join(present, ' AND ') : Prisma.sql`TRUE`;
}
