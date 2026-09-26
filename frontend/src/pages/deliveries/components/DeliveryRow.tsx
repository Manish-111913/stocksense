import { type MouseEvent } from 'react'
import type { Delivery, DocumentStatus } from '../../../api/types.ts'
import { formatQty } from '../../products/productsData.ts'
import { deliveryQuantityLabel, formatDeliveryDate, linesLabel, ROW_TONES, shortLines } from '../data.ts'

export function StatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case 'READY':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
          Ready
        </span>
      )
    case 'WAITING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Waiting
        </span>
      )
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Draft
        </span>
      )
    case 'DONE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="material-symbols-outlined text-[12px]">done_all</span>
          Done
        </span>
      )
    case 'CANCELED':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">Canceled</span>
  }
}

/** Stock availability at the source location (open deliveries only) */
export function AvailabilityBadge({ delivery }: { delivery: Delivery }) {
  if (delivery.status === 'DONE') return <span className="text-[11px] text-emerald-700 font-medium">Shipped</span>
  if (delivery.status === 'CANCELED') return <span className="text-[11px] text-slate-400">—</span>
  const short = shortLines(delivery)
  if (short.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
        <span className="material-symbols-outlined text-[12px]">check_circle</span>
        In stock
      </span>
    )
  }
  const title = short.map((item) => `${item.sku}: short ${formatQty(Number(item.shortage))} ${item.unitOfMeasure} (${formatQty(Number(item.available))} available)`).join('\n')
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title={title}>
      <span className="material-symbols-outlined text-[12px]">warning</span>
      {`Short: ${linesLabel(short.length)}`}
    </span>
  )
}

interface DeliveryRowProps {
  delivery: Delivery
  isBusy: boolean
  onOpen: (delivery: Delivery) => void
  onEdit: (delivery: Delivery) => void
  onConfirm: (delivery: Delivery) => void
  onCheckAvailability: (delivery: Delivery) => void
  onPick: (delivery: Delivery) => void
  onPack: (delivery: Delivery) => void
  onValidate: (delivery: Delivery) => void
  onCancel: (delivery: Delivery) => void
}

const PRIMARY = 'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-xs transition-all flex items-center gap-1 disabled:opacity-60'
const AMBER = 'px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shadow-xs transition-all flex items-center gap-1 disabled:opacity-60'
const VIEW = 'p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors'
const CANCEL = 'p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-60'

export function DeliveryRow({ delivery, isBusy, onOpen, onEdit, onConfirm, onCheckAvailability, onPick, onPack, onValidate, onCancel }: DeliveryRowProps) {
  const tone = ROW_TONES[delivery.status]
  const isCanceled = delivery.status === 'CANCELED'

  function handleRefClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    onOpen(delivery)
  }

  const viewButton = (
    <button className={VIEW} onClick={() => onOpen(delivery)} title="View delivery">
      <span className="material-symbols-outlined text-[16px]">visibility</span>
    </button>
  )
  const cancelButton = (
    <button className={CANCEL} disabled={isBusy} onClick={() => onCancel(delivery)} title="Cancel delivery">
      <span className="material-symbols-outlined text-[16px]">block</span>
    </button>
  )

  function renderActions() {
    switch (delivery.status) {
      case 'DRAFT':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] transition-all disabled:opacity-60" disabled={isBusy} onClick={() => onEdit(delivery)}>
              Edit
            </button>
            <button className={PRIMARY} disabled={isBusy} onClick={() => onConfirm(delivery)}>
              <span className="material-symbols-outlined text-[14px]">task_alt</span>
              <span>{isBusy ? 'Working...' : 'Confirm'}</span>
            </button>
            {cancelButton}
          </div>
        )
      case 'WAITING':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={AMBER} disabled={isBusy} onClick={() => onCheckAvailability(delivery)}>
              <span className="material-symbols-outlined text-[14px]">inventory</span>
              <span>{isBusy ? 'Checking...' : 'Check Availability'}</span>
            </button>
            {cancelButton}
            {viewButton}
          </div>
        )
      case 'READY': {
        const step = !delivery.picked
          ? { label: 'Pick', icon: 'forklift', run: onPick, className: AMBER }
          : !delivery.packed
            ? { label: 'Pack', icon: 'package_2', run: onPack, className: AMBER }
            : { label: 'Validate', icon: 'task_alt', run: onValidate, className: PRIMARY }
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={step.className} disabled={isBusy} onClick={() => step.run(delivery)}>
              <span className="material-symbols-outlined text-[14px]">{step.icon}</span>
              <span>{isBusy ? 'Working...' : step.label}</span>
            </button>
            {viewButton}
          </div>
        )
      }
      case 'DONE':
      case 'CANCELED':
        return (
          <button className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-all inline-flex items-center gap-1" onClick={() => onOpen(delivery)}>
            <span className="material-symbols-outlined text-[13px]">visibility</span>
            <span>View</span>
          </button>
        )
    }
  }

  return (
    <tr className={tone.rowClass} data-status={delivery.status}>
      <td className={tone.refCellClass}>
        <a className="hover:underline flex items-center gap-1.5" href="#" onClick={handleRefClick}>
          <span className={tone.refIconClass}>{tone.refIcon}</span>
          <span>{delivery.reference}</span>
        </a>
      </td>
      <td className={isCanceled ? 'py-3 px-4 font-medium text-slate-600' : 'py-3 px-4 font-medium text-slate-900'}>
        <div className={isCanceled ? 'font-medium line-through' : 'font-semibold'}>{delivery.customer.name}</div>
        {delivery.customer.code && <div className="text-[11px] text-slate-400 font-mono">{delivery.customer.code}</div>}
      </td>
      <td className="py-3 px-4">
        <div className={isCanceled ? 'text-slate-500' : 'font-medium text-slate-800'}>{delivery.warehouse.name}</div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">pin_drop</span>
          <span>{delivery.sourceLocation.name}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={isCanceled ? 'px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-500' : 'px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-700'}>{linesLabel(delivery.lineCount)}</span>
      </td>
      <td className={isCanceled ? 'py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap' : 'py-3 px-4 text-right font-mono text-slate-900 font-bold whitespace-nowrap'}>{deliveryQuantityLabel(delivery)}</td>
      <td className="py-3 px-4 text-center">
        <AvailabilityBadge delivery={delivery} />
      </td>
      <td className="py-3 px-4 text-center">
        <StatusBadge status={delivery.status} />
        {delivery.status === 'READY' && (
          <div className="mt-1 text-[10px] font-mono text-slate-500 whitespace-nowrap">
            <span className={delivery.picked ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>{delivery.picked ? '✓ Picked' : '○ Pick'}</span>
            <span className="text-slate-300"> · </span>
            <span className={delivery.packed ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>{delivery.packed ? '✓ Packed' : '○ Pack'}</span>
          </div>
        )}
      </td>
      <td className={tone.dateCellClass}>
        <div>{formatDeliveryDate(delivery.deliveryDate)}</div>
        <div className={tone.timeClass}>{delivery.createdBy.fullName}</div>
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap">{renderActions()}</td>
    </tr>
  )
}
