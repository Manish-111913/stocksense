import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client.ts'
import { createWarehouse, updateWarehouse } from '../../api/warehouses.ts'
import type { Warehouse } from '../../api/types.ts'
import { CODE_HINT, CODE_PATTERN, errorMessage } from './data.ts'

const INPUT = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500'
const INPUT_INVALID = 'w-full px-3 py-2 bg-slate-50 border border-rose-300 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500'

type WarehouseFormModalProps = {
  /** Edit mode when given, create mode otherwise */
  warehouse: Warehouse | null
  onClose: () => void
  onSaved: (warehouse: Warehouse, created: boolean) => void
}

// Add / Edit Warehouse modal: name, code and address / notes
export function WarehouseFormModal({ warehouse, onClose, onSaved }: WarehouseFormModalProps) {
  const [name, setName] = useState(warehouse?.name ?? '')
  const [code, setCode] = useState(warehouse?.code ?? '')
  const [description, setDescription] = useState(warehouse?.description ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    const nextNameError = trimmedName ? null : 'Warehouse name is required.'
    const nextCodeError = !trimmedCode ? 'Warehouse code is required.' : CODE_PATTERN.test(trimmedCode) ? null : CODE_HINT
    setNameError(nextNameError)
    setCodeError(nextCodeError)
    setFormError(null)
    if (nextNameError || nextCodeError) return

    setIsSaving(true)
    try {
      const input = { name: trimmedName, code: trimmedCode, description: description.trim() }
      const saved = warehouse
        ? await updateWarehouse(warehouse.id, input)
        : await createWarehouse({ ...input, description: input.description || undefined })
      onSaved(saved, !warehouse)
    } catch (err) {
      const message = errorMessage(err, 'Could not save the warehouse. Please try again.')
      if (err instanceof ApiError && (err.status === 409 || /code/i.test(message))) setCodeError(message)
      else setFormError(message)
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="warehouseFormModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{warehouse ? 'Edit Facility' : 'New Facility'}</span>
            <h3 className="text-base font-bold text-slate-900">{warehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h3>
          </div>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <form className="p-6 space-y-4 text-xs" noValidate onSubmit={handleSubmit}>
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="warehouseName">Warehouse Name</label>
            <input autoFocus className={nameError ? INPUT_INVALID : INPUT} id="warehouseName" maxLength={150} onChange={(e) => { setName(e.target.value); setNameError(null) }} placeholder="e.g. Main Warehouse" type="text" value={name} />
            {nameError && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">error</span> {nameError}
              </p>
            )}
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="warehouseCode">Warehouse Code</label>
            <input className={`${codeError ? INPUT_INVALID : INPUT} font-mono uppercase`} id="warehouseCode" maxLength={50} onChange={(e) => { setCode(e.target.value); setCodeError(null) }} placeholder="e.g. WH-001" type="text" value={code} />
            {codeError ? (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">error</span> {codeError}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">{CODE_HINT}</p>
            )}
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="warehouseDescription">Address / Notes <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea className={`${INPUT} resize-none`} id="warehouseDescription" maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="Street, city, or any notes about this facility" rows={3} value={description} />
          </div>
          <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/60 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-2.5">
            <button className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs" onClick={onClose} type="button">Cancel</button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-60" disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : warehouse ? 'Save Changes' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
