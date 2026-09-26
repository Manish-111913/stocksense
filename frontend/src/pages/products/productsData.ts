import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client.ts'
import type { StockStatus } from '../../api/types.ts'

/** User-readable message for a failed API call */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  return error instanceof ApiError ? error.message : fallback
}

/** Unit-of-measure choices offered when creating / editing a product */
export const UOM_OPTIONS: { value: string; label: string }[] = [
  { value: 'PCS', label: 'PCS (Pieces)' },
  { value: 'KG', label: 'KG (Kilograms)' },
  { value: 'L', label: 'L (Litres)' },
  { value: 'M', label: 'M (Meters)' },
  { value: 'BOX', label: 'BOX (Boxes / Cartons)' },
]

/** UOM options, plus the product's current unit if it isn't one of the standard choices */
export function uomOptionsWith(current: string) {
  return !current || UOM_OPTIONS.some((option) => option.value === current) ? UOM_OPTIONS : [...UOM_OPTIONS, { value: current, label: current }]
}

export function uomLabel(uom: string) {
  return UOM_OPTIONS.find((option) => option.value === uom)?.label ?? uom
}

/** Colour of the stock breakdown button and the reorder "Min" label */
export type StockTone = 'normal' | 'low' | 'out'

export const STOCK_TONE_BY_STATUS: Record<StockStatus, StockTone> = {
  IN_STOCK: 'normal',
  LOW_STOCK: 'low',
  OUT_OF_STOCK: 'out',
}

/** Reorder-rule note shown under "Min: …" in the products table */
export const RULE_NOTE: Record<StockStatus, { text: string; className: string }> = {
  IN_STOCK: { text: 'Healthy', className: 'text-emerald-600 font-medium' },
  LOW_STOCK: { text: 'Reorder trigger hit', className: 'text-amber-600 font-medium' },
  OUT_OF_STOCK: { text: 'Critical Shortage', className: 'text-rose-600 font-semibold' },
}

export function formatQty(value: number) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Suggests a SKU from the product name: first 3 letters of the first word, then initials / digits of the rest */
export function suggestSku(name: string): string {
  const [first, ...others] = name.toUpperCase().match(/[A-Z0-9]+/g) ?? []
  if (!first) return ''
  const prefix = first.slice(0, 3)
  const rest = others
    .map((word) => (/\d/.test(word) ? word.replace(/\D/g, '') : word[0]))
    .join('')
    .slice(0, 5)
  return `${prefix}-${rest || '001'}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: string) => UUID_RE.test(value)

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
