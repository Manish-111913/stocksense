// Form helpers for the receipt screen (/receipts/new and /receipts/:id)
import type { ReceiptInput } from '../../../api/receipts.ts'
import type { DocumentStatus, Receipt } from '../../../api/types.ts'

export interface ReceiptLine {
  productId: string
  name: string
  sku: string
  unit: string
  /** Raw input value, so the field can be cleared while typing */
  qty: string
}

/** Values of the receipt form inputs */
export interface ReceiptForm {
  supplierId: string
  warehouseId: string
  locationId: string
  /** YYYY-MM-DD */
  receiptDate: string
  lines: ReceiptLine[]
}

/** Option of the supplier / warehouse / location selects */
export interface SelectOption {
  id: string
  label: string
}

/** Only DRAFT and WAITING receipts can be edited (the backend answers 409 otherwise) */
export const isEditableStatus = (status: DocumentStatus) => status === 'DRAFT' || status === 'WAITING'

/** Today as YYYY-MM-DD in the user's time zone */
export function todayIso() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const emptyForm = (): ReceiptForm => ({ supplierId: '', warehouseId: '', locationId: '', receiptDate: todayIso(), lines: [] })

export function formFromReceipt(receipt: Receipt): ReceiptForm {
  return {
    supplierId: receipt.supplier.id,
    warehouseId: receipt.warehouse.id,
    locationId: receipt.location.id,
    receiptDate: receipt.receiptDate.slice(0, 10),
    lines: receipt.items.map((item) => ({ productId: item.productId, name: item.productName, sku: item.sku, unit: item.unitOfMeasure, qty: String(Number(item.quantity)) })),
  }
}

/** Payload for createReceipt / updateReceipt (call once every quantity parses) */
export function toReceiptInput(form: ReceiptForm): ReceiptInput {
  return {
    supplierId: form.supplierId,
    warehouseId: form.warehouseId,
    locationId: form.locationId,
    receiptDate: form.receiptDate,
    items: form.lines.map((line) => ({ productId: line.productId, quantity: parseQty(line.qty) ?? 0 })),
  }
}

/** Comparable snapshot of the form, used to detect unsaved changes */
export function formKey(form: ReceiptForm) {
  return JSON.stringify([form.supplierId, form.warehouseId, form.locationId, form.receiptDate, form.lines.map((line) => [line.productId, parseQty(line.qty) ?? line.qty])])
}

/** Received quantity of a line, or null unless it is > 0 with at most 3 decimals */
export function parseQty(qty: string): number | null {
  const value = Number(qty)
  if (qty.trim() === '' || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 1000) / 1000 === value ? value : null
}

/** Adds the record's current value when it is missing from the active options (e.g. deactivated since) */
export function withCurrent(options: SelectOption[], current: SelectOption | null) {
  return current && !options.some((option) => option.id === current.id) ? [current, ...options] : options
}

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => (count === 1 ? singular : pluralForm)
