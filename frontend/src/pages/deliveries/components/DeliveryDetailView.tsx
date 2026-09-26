import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../../api/client.ts'
import { cancelDelivery, checkDeliveryAvailability, confirmDelivery, getDelivery, packDelivery, pickDelivery, validateDelivery } from '../../../api/deliveries.ts'
import type { Delivery, StockChangeLine } from '../../../api/types.ts'
import { useToast } from '../../../context/toast.ts'
import { productDetailPath } from '../../../routes.ts'
import { errorMessage, formatQty, isUuid } from '../../products/productsData.ts'
import { deliveryQuantityLabel, formatDateTime, formatDeliveryDate, isEditableStatus, isInsufficientStock, linesLabel, shortLines } from '../data.ts'
import { AvailabilityBadge, StatusBadge } from './DeliveryRow.tsx'
import { DeliveryValidateModal } from './DeliveryValidateModal.tsx'

interface DeliveryDetailViewProps {
  id: string
  onBack: () => void
  onEdit: (id: string) => void
}

type BusyAction = 'confirm' | 'check' | 'pick' | 'pack' | 'validate' | 'cancel'
type StepState = 'done' | 'current' | 'todo'

const STEP_CIRCLE: Record<StepState, string> = {
  done: 'w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs',
  current: 'w-8 h-8 rounded-full bg-indigo-600 ring-4 ring-indigo-100 text-white flex items-center justify-center font-bold text-xs shadow-sm',
  todo: 'w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center font-bold text-xs',
}
const STEP_LABEL: Record<StepState, string> = {
  done: 'mt-2 text-xs font-semibold text-slate-900',
  current: 'mt-2 text-xs font-bold text-indigo-700',
  todo: 'mt-2 text-xs font-medium text-slate-400',
}
const STEP_NOTE: Record<StepState, string> = {
  done: 'text-[10px] text-slate-400 font-mono text-center',
  current: 'text-[10px] text-indigo-600 font-semibold font-mono text-center',
  todo: 'text-[10px] text-slate-400 font-mono text-center',
}

const SECONDARY_BTN = 'px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-60'
const PRIMARY_BTN = 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-60'

const who = (event: { by: { fullName: string }; at: string } | null) => (event ? `${event.by.fullName} · ${formatDateTime(event.at)}` : null)

// VIEW 3: DELIVERY DETAIL & WORKFLOW STAGE VIEW
export function DeliveryDetailView({ id, onBack, onEdit }: DeliveryDetailViewProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'notfound'>(isUuid(id) ? 'loading' : 'notfound')
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [busyAction, setBusyAction] = useState<BusyAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)
  const [stockChanges, setStockChanges] = useState<StockChangeLine[] | null>(null)
  const [isValidateOpen, setIsValidateOpen] = useState(false)
  const [validateError, setValidateError] = useState<string | null>(null)

  useEffect(() => {
    if (!isUuid(id)) return
    let cancelled = false
    getDelivery(id)
      .then((res) => {
        if (cancelled) return
        setDelivery(res)
        setLoadState('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setLoadState('notfound')
        } else {
          setLoadError(errorMessage(err, 'Could not load this delivery. Please try again.'))
          setLoadState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  if (loadState === 'loading' && !delivery) {
    return (
      <div className="flex flex-col pt-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-xs text-center text-xs text-slate-500">
          <span className="material-symbols-outlined text-[22px] text-slate-400 animate-spin block mx-auto mb-2 w-fit">progress_activity</span>
          Loading delivery...
        </div>
      </div>
    )
  }

  if (!delivery) {
    const notFound = loadState === 'notfound'
    return (
      <div className="flex flex-col pt-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-100">
            <span className="material-symbols-outlined text-3xl">{notFound ? 'search_off' : 'cloud_off'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{notFound ? 'Delivery not found' : 'Couldn’t load this delivery'}</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{notFound ? 'It may have been removed, or the link is wrong.' : loadError}</p>
          <div className="pt-3 flex items-center justify-center gap-2.5">
            <button className={SECONDARY_BTN} onClick={onBack}>
              Back to Deliveries
            </button>
            {!notFound && (
              <button
                className={PRIMARY_BTN}
                onClick={() => {
                  setLoadState('loading')
                  setReloadKey((key) => key + 1)
                }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const current = delivery
  const status = current.status
  const isBusy = busyAction !== null
  const short = shortLines(current)
  const isOpen = status === 'DRAFT' || status === 'WAITING' || status === 'READY'

  /** Reloads the delivery after a failed action (it probably changed elsewhere) */
  function refetch() {
    getDelivery(current.id)
      .then(setDelivery)
      .catch(() => undefined)
  }

  async function run(action: BusyAction, work: () => Promise<Delivery>, success: (d: Delivery) => [string, string], fallback: string) {
    setBusyAction(action)
    setActionError(null)
    setStockError(null)
    try {
      const updated = await work()
      setDelivery(updated)
      const [title, subtitle] = success(updated)
      showToast(title, subtitle)
    } catch (err) {
      setActionError(errorMessage(err, fallback))
      refetch()
    } finally {
      setBusyAction(null)
    }
  }

  function handleConfirm() {
    void run(
      'confirm',
      () => confirmDelivery(current.id),
      (d) => (d.status === 'READY' ? ['Delivery Confirmed', `${d.reference} is ready: every line is in stock.`] : ['Delivery Waiting', `${d.reference} is waiting: some lines are short on stock.`]),
      'Could not confirm the delivery. Please try again.',
    )
  }

  function handleCheckAvailability() {
    void run(
      'check',
      () => checkDeliveryAvailability(current.id),
      (d) => (d.status === 'READY' ? ['Stock Available', `${d.reference} is now ready to pick.`] : ['Still Waiting', `${d.reference} is still short on stock.`]),
      'Could not check availability. Please try again.',
    )
  }

  function handlePick() {
    void run('pick', () => pickDelivery(current.id), (d) => ['Delivery Picked', `${d.reference} was picked. Pack it next.`], 'Could not mark the delivery as picked. Please try again.')
  }

  function handlePack() {
    void run('pack', () => packDelivery(current.id), (d) => ['Delivery Packed', `${d.reference} was packed and can be validated.`], 'Could not mark the delivery as packed. Please try again.')
  }

  function handleCancel() {
    if (!window.confirm(`Cancel delivery ${current.reference}? It will be kept as Canceled and no stock will move. This can't be undone.`)) return
    void run('cancel', () => cancelDelivery(current.id), (d) => ['Delivery Canceled', `${d.reference} has been canceled. No stock moved.`], 'Could not cancel the delivery. Please try again.')
  }

  function openValidateModal() {
    setValidateError(null)
    setIsValidateOpen(true)
  }

  async function executeValidation() {
    setBusyAction('validate')
    setValidateError(null)
    setActionError(null)
    setStockError(null)
    try {
      const { stockChanges: changes, ...validated } = await validateDelivery(current.id)
      setDelivery(validated)
      setStockChanges(changes)
      setIsValidateOpen(false)
      showToast('Delivery Validated', `${validated.reference} shipped; stock decreased at ${validated.sourceLocation.name}.`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (isInsufficientStock(err)) {
        // Nothing changed: show the server message on the page and refresh the availability
        setStockError(errorMessage(err))
        setIsValidateOpen(false)
      } else {
        setValidateError(errorMessage(err, 'Could not validate the delivery. Please try again.'))
      }
      refetch()
    } finally {
      setBusyAction(null)
    }
  }

  // Next workflow step for the main button
  const primary: { label: string; busy: string; icon: string; action: BusyAction; onClick: () => void } | null =
    status === 'DRAFT'
      ? { label: 'Confirm Delivery', busy: 'Confirming...', icon: 'task_alt', action: 'confirm', onClick: handleConfirm }
      : status === 'WAITING'
        ? { label: 'Check Availability', busy: 'Checking...', icon: 'inventory', action: 'check', onClick: handleCheckAvailability }
        : status === 'READY' && !current.picked
          ? { label: 'Mark Picked', busy: 'Picking...', icon: 'forklift', action: 'pick', onClick: handlePick }
          : status === 'READY' && !current.packed
            ? { label: 'Mark Packed', busy: 'Packing...', icon: 'package_2', action: 'pack', onClick: handlePack }
            : status === 'READY'
              ? { label: 'Validate Delivery', busy: 'Validating...', icon: 'task_alt', action: 'validate', onClick: openValidateModal }
              : null

  // Pipeline: Draft → Waiting / Ready → Picked → Packed → Done
  const isDone = status === 'DONE'
  const steps: { label: string; icon: string; state: StepState; note: string }[] = [
    { label: '1. Draft', icon: 'edit_note', state: status === 'DRAFT' ? 'current' : 'done', note: formatDateTime(current.createdAt) },
    {
      label: status === 'WAITING' ? '2. Waiting' : '2. Ready',
      icon: status === 'WAITING' ? 'hourglass_top' : 'inventory',
      state: status === 'WAITING' ? 'current' : status === 'READY' || isDone || current.picked ? 'done' : 'todo',
      note: status === 'WAITING' ? 'Short on stock' : status === 'DRAFT' ? 'Confirm to check stock' : 'Stock available',
    },
    { label: '3. Picked', icon: 'forklift', state: current.picked ? 'done' : status === 'READY' ? 'current' : 'todo', note: who(current.picked) ?? 'Not picked' },
    { label: '4. Packed', icon: 'package_2', state: current.packed ? 'done' : status === 'READY' && current.picked ? 'current' : 'todo', note: who(current.packed) ?? 'Not packed' },
    {
      label: '5. Done',
      icon: 'done_all',
      state: isDone ? 'done' : status === 'READY' && current.picked && current.packed ? 'current' : 'todo',
      note: current.validatedAt ? formatDateTime(current.validatedAt) : status === 'CANCELED' ? 'Canceled' : 'Awaiting validation',
    },
  ]

  const ledgerState = isDone ? 'POSTED' : status === 'CANCELED' ? 'CANCELED' : 'PENDING_VALIDATION'

  return (
    <div className="flex-col space-y-6 pt-6 flex" id="viewDeliveryDetail">
      {/* Detail Order Header & Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-md text-slate-900 font-bold" id="detailOrderRef">{current.reference}</h2>
                <span id="detailBadgeStatus">
                  <StatusBadge status={status} />
                </span>
                {status === 'READY' && <span className="text-[11px] font-mono text-slate-500">{current.packed ? '(Packed)' : current.picked ? '(Picked)' : '(To pick)'}</span>}
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span>
                  Customer: <strong className="text-slate-800">{current.customer.name}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  From: <strong className="text-slate-800">{`${current.warehouse.name} / ${current.sourceLocation.name}`}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Delivery date: <strong className="text-slate-800">{formatDeliveryDate(current.deliveryDate)}</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-400">{`Created by ${current.createdBy.fullName}, ${formatDateTime(current.createdAt)}`}</span>
              </div>
            </div>
          </div>
          {/* Detail Actions Toolbar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isOpen && (
              <button className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-60" disabled={isBusy} id="btnDetailCancel" onClick={handleCancel}>
                {busyAction === 'cancel' ? 'Canceling...' : 'Cancel Order'}
              </button>
            )}
            {isEditableStatus(status) && (
              <button className={SECONDARY_BTN} disabled={isBusy} onClick={() => onEdit(current.id)}>
                <span className="material-symbols-outlined text-[15px]">edit</span>
                <span>Edit</span>
              </button>
            )}
            {status !== 'CANCELED' && (
              <button className={SECONDARY_BTN} id="btnDetailPrint" onClick={() => window.print()}>
                <span className="material-symbols-outlined text-[15px]">print</span>
                <span>Print Pick List</span>
              </button>
            )}
            {primary ? (
              <button className={PRIMARY_BTN} disabled={isBusy} id="btnDetailValidate" onClick={primary.onClick}>
                <span className={busyAction === primary.action ? 'material-symbols-outlined text-[16px] animate-spin' : 'material-symbols-outlined text-[16px]'}>{busyAction === primary.action ? 'progress_activity' : primary.icon}</span>
                <span>{busyAction === primary.action ? primary.busy : primary.label}</span>
              </button>
            ) : (
              <button className={SECONDARY_BTN} onClick={onBack}>
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Back to Deliveries</span>
              </button>
            )}
          </div>
        </div>
        {/* Workflow Stepper */}
        <div className="py-2">
          <div className="relative flex items-start justify-between">
            {steps.map((step, index) => (
              <Fragment key={step.label}>
                {index > 0 && <div className={step.state === 'done' ? 'flex-1 h-0.5 bg-emerald-500 mx-2 mt-4' : step.state === 'current' ? 'flex-1 h-0.5 bg-indigo-600 mx-2 mt-4' : 'flex-1 h-0.5 bg-slate-200 mx-2 mt-4'} />}
                <div className="flex flex-col items-center relative z-10 max-w-[120px]">
                  <div className={STEP_CIRCLE[step.state]}>
                    <span className="material-symbols-outlined text-[16px]">{step.state === 'done' ? 'check' : step.icon}</span>
                  </div>
                  <span className={STEP_LABEL[step.state]}>{step.label}</span>
                  <span className={STEP_NOTE[step.state]}>{step.note}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {actionError}
          </span>
          <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setActionError(null)}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Validation refused: not enough stock at the source location */}
      {stockError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between gap-3" id="detailStockErrorBanner">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-rose-600 text-[22px]">inventory_2</span>
            <div>
              <h4 className="font-bold text-rose-900">Validation blocked: insufficient stock</h4>
              <p className="text-rose-800 text-[11px] mt-0.5">{stockError}</p>
              <p className="text-rose-700 text-[11px] mt-0.5">Nothing was changed. Restock the source location (e.g. with a receipt or transfer), then validate again.</p>
            </div>
          </div>
          <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setStockError(null)}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Completed State Banner */}
      {isDone && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start justify-between gap-3" id="detailValidatedBanner">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">verified</span>
            <div>
              <h4 className="font-bold text-emerald-900">Delivery Validated &amp; Stock Ledger Updated</h4>
              <p className="text-emerald-800 text-[11px]">
                {`-${deliveryQuantityLabel(current)} shipped from ${current.warehouse.name} / ${current.sourceLocation.name}.`}
                {current.validatedBy && current.validatedAt && ` Validated by ${current.validatedBy.fullName} on ${formatDateTime(current.validatedAt)}.`}
              </p>
              <ul className="mt-2 space-y-0.5 text-[11px] text-emerald-800">
                {current.items.map((item) => {
                  const change = stockChanges?.find((entry) => entry.productId === item.productId)
                  return (
                    <li className="flex flex-wrap items-center gap-1.5" key={item.id}>
                      <button className="font-mono font-semibold underline hover:text-emerald-950" onClick={() => navigate(productDetailPath(item.productId))}>
                        {item.sku}
                      </button>
                      <span>{`-${formatQty(Number(item.quantity))} ${item.unitOfMeasure}`}</span>
                      {change && <span className="font-mono text-emerald-700">{`(stock ${formatQty(change.before)} → ${formatQty(change.after)} ${change.unitOfMeasure})`}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Canceled notice */}
      {status === 'CANCELED' && (
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-2.5 text-xs">
          <span className="material-symbols-outlined text-slate-500 text-[18px] flex-shrink-0">block</span>
          <span>
            <strong className="font-semibold text-slate-900">This delivery was canceled.</strong> It is kept for reference only; stock balances were not changed.
          </span>
        </div>
      )}

      {/* Split-Pane Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lines Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-headline-sm text-headline-sm text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[18px]">checklist</span>
              <span>Pick List</span>
            </h3>
            <AvailabilityBadge delivery={current} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] font-label-sm uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  <th className="py-2 font-semibold">Line Item</th>
                  <th className="py-2 font-semibold">SKU</th>
                  <th className="py-2 font-semibold">Location</th>
                  <th className="py-2 font-semibold text-right">Available</th>
                  <th className="py-2 font-semibold text-right">Quantity</th>
                  <th className="py-2 text-center w-16">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-body-sm text-slate-700">
                {current.items.map((item) => {
                  const isShort = isOpen && Number(item.shortage) > 0
                  return (
                    <tr key={item.id}>
                      <td className="py-3">
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        {isShort && <div className="text-[11px] text-rose-600">{`Short ${formatQty(Number(item.shortage))} ${item.unitOfMeasure}`}</div>}
                      </td>
                      <td className="py-3 font-mono font-medium text-slate-600">{item.sku}</td>
                      <td className="py-3 text-slate-600">
                        <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{`${current.warehouse.code} / ${current.sourceLocation.code}`}</span>
                      </td>
                      <td className={isShort ? 'py-3 text-right font-mono text-rose-600 font-semibold' : 'py-3 text-right font-mono text-slate-500'}>{isOpen ? `${formatQty(Number(item.available))} ${item.unitOfMeasure}` : '—'}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">{`${formatQty(Number(item.quantity))} ${item.unitOfMeasure}`}</td>
                      <td className="py-3 text-center">
                        {status === 'CANCELED' ? (
                          <span className="text-slate-300">—</span>
                        ) : isShort ? (
                          <span className="material-symbols-outlined text-rose-500 text-[18px]" title="Short on stock">
                            warning
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">task_alt</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {isOpen && short.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
              <span>{`${linesLabel(short.length)} short at ${current.sourceLocation.name} right now. The delivery can only be validated once the stock is there.`}</span>
            </div>
          )}
        </div>
        {/* Right Column: Ledger Preview & Pick / Pack record */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-headline-sm text-headline-sm text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">account_balance</span>
                <span>Stock Ledger Preview</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400 uppercase">{isDone ? 'Committed' : 'Pre-Commit'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2">
              <div className="text-slate-400 flex justify-between">
                <span>TRANSACTION TYPE:</span>
                <span className="text-indigo-400 font-bold">DELIVERY / OUT</span>
              </div>
              {current.items.map((item, index) => (
                <div className={index === 0 ? 'flex justify-between gap-2 border-t border-slate-800 pt-1 text-rose-300' : 'flex justify-between gap-2 text-rose-300'} key={item.id}>
                  <span>{`${item.sku}:`}</span>
                  <span className="text-right">{`-${formatQty(Number(item.quantity))} ${item.unitOfMeasure} (${current.sourceLocation.code})`}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-400">
                <span>LEDGER STATE:</span>
                <span className={isDone ? 'text-emerald-400 font-bold' : status === 'CANCELED' ? 'text-slate-400 font-bold' : 'text-amber-400 font-bold'} id="ledgerPreviewState">
                  {ledgerState}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              Validation commits this delivery permanently to the <strong>Stock Ledger</strong>. Inventory levels will immediately decrease, and this action cannot be undone.
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5 text-xs">
            <h4 className="font-headline-sm text-headline-sm text-slate-900 pb-1 border-b border-slate-100">Pick &amp; Pack Record</h4>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Picked:</span>
              <span className={current.picked ? 'font-medium text-slate-800 text-right' : 'text-slate-400 text-right'}>{who(current.picked) ?? 'Not yet'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Packed:</span>
              <span className={current.packed ? 'font-medium text-slate-800 text-right' : 'text-slate-400 text-right'}>{who(current.packed) ?? 'Not yet'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Validated:</span>
              <span className={current.validatedBy ? 'font-medium text-emerald-700 text-right' : 'text-slate-400 text-right'}>{current.validatedBy && current.validatedAt ? `${current.validatedBy.fullName} · ${formatDateTime(current.validatedAt)}` : 'Not yet'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Total:</span>
              <span className="font-mono font-medium text-slate-800 text-right">{`${deliveryQuantityLabel(current)} · ${linesLabel(current.lineCount)}`}</span>
            </div>
          </div>
        </div>
      </div>

      {isValidateOpen && <DeliveryValidateModal delivery={current} error={validateError} isPosting={busyAction === 'validate'} onClose={() => busyAction !== 'validate' && setIsValidateOpen(false)} onConfirm={() => void executeValidation()} />}
    </div>
  )
}
