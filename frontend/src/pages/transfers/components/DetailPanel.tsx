import { type DocumentStatus, type Transfer } from '../../../api/types.ts'
import { formatQty } from '../../products/productsData.ts'
import { formatDateTime, formatTransferDate, isOpenStatus, linesLabel, shortLineCount, transferQuantityLabel } from '../data.ts'
import { StatusBadge } from './StatusBadge.tsx'

const PANEL_OPEN = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 flex flex-col'
const PANEL_CLOSED = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform translate-x-full transition-transform duration-300 flex flex-col'

const FOOTER_SECONDARY = 'flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors text-center disabled:opacity-50'
const FOOTER_PRIMARY = 'flex-1 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-all text-center flex items-center justify-center gap-1.5 disabled:opacity-50'
const FOOTER_DANGER = 'py-2 px-3 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold shadow-xs transition-colors text-center disabled:opacity-50'

interface StatusBanner {
  title: string
  note: string
  icon: string
  boxClass: string
  labelClass: string
  titleClass: string
  noteClass: string
  iconClass: string
}

type BannerTone = Pick<StatusBanner, 'boxClass' | 'labelClass' | 'titleClass' | 'noteClass' | 'iconClass'>

// Full class strings so Tailwind can see them
const BANNER_TONES: Record<'emerald' | 'amber' | 'slate' | 'indigo', BannerTone> = {
  emerald: {
    boxClass: 'flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900',
    labelClass: 'text-[10px] font-bold uppercase tracking-wider text-emerald-700',
    titleClass: 'text-base font-bold text-emerald-950 mt-0.5',
    noteClass: 'text-[11px] text-emerald-800 mt-0.5',
    iconClass: 'material-symbols-outlined text-3xl text-emerald-600',
  },
  amber: {
    boxClass: 'flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900',
    labelClass: 'text-[10px] font-bold uppercase tracking-wider text-amber-700',
    titleClass: 'text-base font-bold text-amber-950 mt-0.5',
    noteClass: 'text-[11px] text-amber-800 mt-0.5',
    iconClass: 'material-symbols-outlined text-3xl text-amber-600',
  },
  slate: {
    boxClass: 'flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-900',
    labelClass: 'text-[10px] font-bold uppercase tracking-wider text-slate-500',
    titleClass: 'text-base font-bold text-slate-950 mt-0.5',
    noteClass: 'text-[11px] text-slate-600 mt-0.5',
    iconClass: 'material-symbols-outlined text-3xl text-slate-400',
  },
  indigo: {
    boxClass: 'flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-900',
    labelClass: 'text-[10px] font-bold uppercase tracking-wider text-indigo-700',
    titleClass: 'text-base font-bold text-indigo-950 mt-0.5',
    noteClass: 'text-[11px] text-indigo-800 mt-0.5',
    iconClass: 'material-symbols-outlined text-3xl text-indigo-600',
  },
}

function bannerFor(transfer: Transfer): StatusBanner {
  const banners: Record<DocumentStatus, () => StatusBanner> = {
    DRAFT: () => ({ ...BANNER_TONES.slate, title: 'Draft', note: 'Confirm to check the source and stage the transfer.', icon: 'edit_note' }),
    WAITING: () => ({ ...BANNER_TONES.amber, title: 'Waiting for Stock', note: `The source is short on ${linesLabel(shortLineCount(transfer))}. Check availability once stock arrives.`, icon: 'hourglass_top' }),
    READY: () => ({ ...BANNER_TONES.indigo, title: 'Ready for Validation', note: 'The source holds every line. Validate to move the stock.', icon: 'task_alt' }),
    DONE: () => ({ ...BANNER_TONES.emerald, title: 'Validated', note: 'Stock moved from source to destination and posted to the ledger.', icon: 'done_all' }),
    CANCELED: () => ({ ...BANNER_TONES.slate, title: 'Canceled', note: 'No stock moved for this transfer.', icon: 'block' }),
  }
  return banners[transfer.status]()
}

interface DetailPanelProps {
  open: boolean
  /** The selected transfer (kept while the panel slides out) */
  transfer: Transfer | null
  error: string | null
  isBusy: boolean
  onClose: () => void
  onRetry: () => void
  onConfirm: (transfer: Transfer) => void
  onEdit: (transfer: Transfer) => void
  onCheckAvailability: (transfer: Transfer) => void
  onValidate: (transfer: Transfer) => void
  onCancel: (transfer: Transfer) => void
}

// Slide-over drawer: transfer detail view panel
export function DetailPanel({ open, transfer, error, isBusy, onClose, onRetry, onConfirm, onEdit, onCheckAvailability, onValidate, onCancel }: DetailPanelProps) {
  const banner = transfer ? bannerFor(transfer) : null
  const showStock = transfer ? isOpenStatus(transfer.status) : false

  function renderActions(t: Transfer) {
    const cancel = (
      <button className={FOOTER_DANGER} disabled={isBusy} onClick={() => onCancel(t)} type="button">
        Cancel Transfer
      </button>
    )
    switch (t.status) {
      case 'DRAFT':
        return (
          <>
            {cancel}
            <button className={FOOTER_SECONDARY} disabled={isBusy} onClick={() => onEdit(t)} type="button">
              Edit
            </button>
            <button className={FOOTER_PRIMARY} disabled={isBusy} onClick={() => onConfirm(t)} type="button">
              <span className="material-symbols-outlined text-[15px]">task_alt</span>
              <span>Confirm</span>
            </button>
          </>
        )
      case 'WAITING':
        return (
          <>
            {cancel}
            <button className={FOOTER_SECONDARY} disabled={isBusy} onClick={() => onEdit(t)} type="button">
              Edit
            </button>
            <button className={FOOTER_PRIMARY} disabled={isBusy} onClick={() => onCheckAvailability(t)} type="button">
              <span className="material-symbols-outlined text-[15px]">inventory</span>
              <span>Check Availability</span>
            </button>
          </>
        )
      case 'READY':
        return (
          <>
            {cancel}
            <button className={FOOTER_PRIMARY} disabled={isBusy} onClick={() => onValidate(t)} type="button">
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>Validate Transfer</span>
            </button>
          </>
        )
      case 'DONE':
      case 'CANCELED':
        return (
          <button className={FOOTER_SECONDARY} onClick={onClose} type="button">
            Close
          </button>
        )
    }
  }

  return (
    <div aria-hidden={!open} className={open ? PANEL_OPEN : PANEL_CLOSED} id="detailPanel">
      <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-indigo-600">receipt_long</span>
          <span className="font-bold text-sm text-slate-900 font-mono" id="panelRef">{transfer?.reference ?? 'Transfer'}</span>
          {transfer && <StatusBadge status={transfer.status} />}
        </div>
        <button className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onClick={onClose} type="button">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </span>
            <button className="font-semibold hover:text-rose-900" onClick={onRetry} type="button">
              Retry
            </button>
          </div>
        )}
        {!transfer && !error && (
          <div className="py-10 text-center text-slate-500">
            <span className="material-symbols-outlined text-[22px] text-slate-400 animate-spin block mx-auto mb-2 w-fit">progress_activity</span>
            Loading transfer...
          </div>
        )}
        {transfer && banner && (
          <>
            {/* Status Banner */}
            <div className={banner.boxClass}>
              <div>
                <div className={banner.labelClass}>Current State</div>
                <div className={banner.titleClass}>{banner.title}</div>
                <p className={banner.noteClass}>{banner.note}</p>
              </div>
              <span className={banner.iconClass}>{banner.icon}</span>
            </div>
            {/* Movement Route Card */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Movement Path</span>
              <div className="flex items-center justify-between gap-3 text-xs pt-1">
                <div>
                  <div className="font-semibold text-slate-900">{transfer.sourceWarehouse.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{`${transfer.sourceLocation.name} (${transfer.sourceLocation.code})`}</div>
                </div>
                <span className="material-symbols-outlined text-indigo-600 text-lg">arrow_right_alt</span>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{transfer.destinationWarehouse.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{`${transfer.destinationLocation.name} (${transfer.destinationLocation.code})`}</div>
                </div>
              </div>
            </div>
            {/* Items Manifest */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{`Items Manifest (${linesLabel(transfer.lineCount)})`}</span>
              {transfer.items.map((item) => (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3" key={item.id}>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{item.productName}</div>
                    <div className="font-mono text-[11px] text-slate-500">SKU: {item.sku}</div>
                  </div>
                  <div className="text-right font-mono whitespace-nowrap">
                    <div className="font-bold text-slate-900 text-sm">{`${formatQty(item.quantity)} ${item.unitOfMeasure}`}</div>
                    {showStock &&
                      (item.shortage > 0 ? (
                        <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/60">{`Short ${formatQty(item.shortage)} · ${formatQty(item.available)} at source`}</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">{`${formatQty(item.available)} at source`}</span>
                      ))}
                    {transfer.status === 'DONE' && <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">Moved</span>}
                  </div>
                </div>
              ))}
            </div>
            {/* Audit Summary */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Summary</span>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-[11px] flex flex-col gap-2 text-slate-600">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Transfer Date:</span>
                  <span className="font-semibold text-slate-800">{formatTransferDate(transfer.transferDate)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Created:</span>
                  <span className="text-slate-800 text-right">{`${transfer.createdBy.fullName} · ${formatDateTime(transfer.createdAt)}`}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Validated:</span>
                  <span className="text-slate-800 text-right">{transfer.validatedBy && transfer.validatedAt ? `${transfer.validatedBy.fullName} · ${formatDateTime(transfer.validatedAt)}` : 'Not validated'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Total Quantity:</span>
                  <span className="text-slate-800">{transferQuantityLabel(transfer)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-200/60 pt-2">
                  <span className="text-slate-400">Company Stock Change:</span>
                  <span className="text-slate-900 font-bold">0 (internal move)</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Drawer Footer Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2.5">
        {transfer ? (
          renderActions(transfer)
        ) : (
          <button className={FOOTER_SECONDARY} onClick={onClose} type="button">
            Close
          </button>
        )}
      </div>
    </div>
  )
}
