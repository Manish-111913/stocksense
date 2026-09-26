import { ApiError } from '../../api/client.ts'
import type { Warehouse } from '../../api/types.ts'

export const PAGE_SIZE = 10

/** Same rule the API enforces for warehouse / location codes (stored uppercase) */
export const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
export const CODE_HINT = 'Letters, digits and . _ / - only (saved in uppercase).'

export type ToastTone = 'success' | 'error'

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  return error instanceof ApiError ? error.message : fallback
}

export function plural(count: number, noun: string) {
  return `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** One row per location (or one row for a warehouse without locations) */
export function downloadNetworkCsv(warehouses: Warehouse[]) {
  const header = ['Warehouse', 'Warehouse Code', 'Address / Notes', 'Warehouse Status', 'Warehouse SKUs', 'Location', 'Location Code', 'Location Status', 'Location SKUs']
  const lines = [header.map(csvCell).join(',')]
  for (const warehouse of warehouses) {
    const base = [warehouse.name, warehouse.code, warehouse.description ?? '', warehouse.status, warehouse.productCount]
    if (warehouse.locations.length === 0) lines.push([...base, '', '', '', ''].map(csvCell).join(','))
    for (const location of warehouse.locations) {
      lines.push([...base, location.name, location.code, location.status, location.productCount].map(csvCell).join(','))
    }
  }
  const url = URL.createObjectURL(new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `warehouse-network-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
