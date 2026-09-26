import { useEffect, useState, type FormEvent } from 'react'
import { createCategory, listCategories, setCategoryStatus, updateCategory } from '../../../api/products.ts'
import type { Category } from '../../../api/types.ts'
import { useToast } from '../../../context/toast.ts'
import { errorMessage, plural } from '../productsData.ts'

// Server limits (backend CreateCategoryDto / UpdateCategoryDto)
const NAME_MAX = 100
const DESCRIPTION_MAX = 500

const INPUT_CLASS = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500'
const EDIT_INPUT_CLASS = 'w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500'
const ROW_BTN = 'px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-60'

const STATUS_PILL = {
  ACTIVE: { badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60', dot: 'w-1.5 h-1.5 rounded-full bg-emerald-500', label: 'Active' },
  INACTIVE: { badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200', dot: 'w-1.5 h-1.5 rounded-full bg-slate-400', label: 'Inactive' },
} as const

interface CategoriesDrawerProps {
  /** Activate / deactivate is for inventory managers only */
  canManageStatus: boolean
  onClose: () => void
  /** Every successful load of the full list (keeps the page's category filter in sync) */
  onCategoriesLoaded: (categories: Category[]) => void
  /** A category was renamed / re-described / (de)activated (product rows show its name and status) */
  onChanged: () => void
}

interface EditState {
  id: string
  name: string
  description: string
}

// Categories drawer: list (active + inactive), create, inline edit and (managers) activate / deactivate
export function CategoriesDrawer({ canManageStatus, onClose, onCategoriesLoaded, onChanged }: CategoriesDrawerProps) {
  const { showToast } = useToast()

  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<Category[] | null>(null)
  // Outcome of the last settled request; a different key means one is in flight
  const [settled, setSettled] = useState<{ key: number; error: string | null } | null>(null)
  const isLoading = settled?.key !== reloadKey
  const loadError = isLoading ? null : (settled?.error ?? null)

  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [editing, setEditing] = useState<EditState | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)

  const reload = () => setReloadKey((key) => key + 1)

  useEffect(() => {
    let cancelled = false
    listCategories()
      .then((res) => {
        if (cancelled) return
        setItems(res)
        setSettled({ key: reloadKey, error: null })
        onCategoriesLoaded(res)
      })
      .catch((err: unknown) => {
        if (!cancelled) setSettled({ key: reloadKey, error: errorMessage(err, 'Could not load categories. Please try again.') })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey, onCategoriesLoaded])

  // Escape closes the drawer
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function setRowError(id: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev }
      if (message) next[id] = message
      else delete next[id]
      return next
    })
  }

  /** Show a server result right away, then re-fetch the list */
  function applyResult(category: Category) {
    setItems((prev) => {
      const list = prev ?? []
      const rest = list.filter((item) => item.id !== category.id)
      return [...rest, category].sort((a, b) => a.name.localeCompare(b.name))
    })
    reload()
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) {
      setFormError('Category name is required.')
      return
    }
    const description = newDescription.trim()
    setIsCreating(true)
    setFormError(null)
    try {
      const created = await createCategory({ name, ...(description ? { description } : {}) })
      setNewName('')
      setNewDescription('')
      applyResult(created)
      showToast('Category created', `${created.name} is ready to use.`)
    } catch (err) {
      setFormError(errorMessage(err, 'Could not create the category. Please try again.'))
    } finally {
      setIsCreating(false)
    }
  }

  function startEdit(category: Category) {
    setEditing({ id: category.id, name: category.name, description: category.description ?? '' })
    setEditError(null)
    setRowError(category.id, null)
  }

  function cancelEdit() {
    setEditing(null)
    setEditError(null)
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const name = editing.name.trim()
    if (!name) {
      setEditError('Category name is required.')
      return
    }
    setIsSavingEdit(true)
    setEditError(null)
    try {
      // An empty description clears it
      const updated = await updateCategory(editing.id, { name, description: editing.description.trim() })
      setEditing(null)
      applyResult(updated)
      onChanged()
      showToast('Category updated', `${updated.name} has been saved.`)
    } catch (err) {
      setEditError(errorMessage(err, 'Could not update the category. Please try again.'))
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleToggleStatus(category: Category) {
    const next = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setStatusBusyId(category.id)
    setRowError(category.id, null)
    try {
      const updated = await setCategoryStatus(category.id, next)
      applyResult(updated)
      onChanged()
      showToast(
        next === 'ACTIVE' ? 'Category activated' : 'Category deactivated',
        next === 'ACTIVE' ? `${updated.name} can be used for products again.` : `${updated.name} can no longer be picked for products.`,
      )
    } catch (err) {
      setRowError(category.id, errorMessage(err, 'Could not change the category status. Please try again.'))
    } finally {
      setStatusBusyId(null)
    }
  }

  function renderRow(category: Category) {
    const pill = STATUS_PILL[category.status]
    const isActive = category.status === 'ACTIVE'
    const rowError = rowErrors[category.id]
    const isEditing = editing?.id === category.id

    return (
      <li className={isActive ? 'p-3 rounded-lg border border-slate-200/80 bg-white' : 'p-3 rounded-lg border border-slate-200/80 bg-slate-50/60'} data-category-name={category.name} key={category.id}>
        {isEditing && editing ? (
          <form className="space-y-2" onSubmit={handleSaveEdit}>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="editCategoryName">Name</label>
              <input
                autoFocus
                className={EDIT_INPUT_CLASS}
                id="editCategoryName"
                maxLength={NAME_MAX}
                onChange={(e) => {
                  setEditing({ ...editing, name: e.target.value })
                  setEditError(null)
                }}
                required
                type="text"
                value={editing.name}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="editCategoryDescription">Description</label>
              <input
                className={EDIT_INPUT_CLASS}
                id="editCategoryDescription"
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => {
                  setEditing({ ...editing, description: e.target.value })
                  setEditError(null)
                }}
                placeholder="Description (optional)"
                type="text"
                value={editing.description}
              />
            </div>
            {editError && (
              <p className="text-[11px] text-rose-600 flex items-start gap-1" id="editCategoryError">
                <span aria-hidden="true" className="material-symbols-outlined text-[13px]">error</span>
                <span>{editError}</span>
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold" onClick={cancelEdit} type="button">
                Cancel
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold disabled:opacity-60" disabled={isSavingEdit} type="submit">
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={isActive ? 'text-xs font-semibold text-slate-800 break-words' : 'text-xs font-semibold text-slate-500 break-words'}>{category.name}</span>
                <span className={pill.badge}>
                  <span className={pill.dot} />
                  {pill.label}
                </span>
              </div>
              <p className={category.description ? 'text-[11px] text-slate-500 mt-0.5 break-words' : 'text-[11px] text-slate-400 italic mt-0.5'}>{category.description || 'No description'}</p>
              <p className="text-[10px] text-slate-400 mt-1">{plural(category.productCount, 'product')}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className={`${ROW_BTN} text-slate-600 hover:bg-slate-100`} onClick={() => startEdit(category)} title="Edit category" type="button">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">edit</span>
                Edit
              </button>
              {canManageStatus && (
                <button
                  className={isActive ? `${ROW_BTN} text-rose-600 hover:bg-rose-50` : `${ROW_BTN} text-emerald-600 hover:bg-emerald-50`}
                  disabled={statusBusyId === category.id}
                  onClick={() => void handleToggleStatus(category)}
                  title={isActive ? 'Deactivate category' : 'Activate category'}
                  type="button"
                >
                  <span aria-hidden="true" className={statusBusyId === category.id ? 'material-symbols-outlined text-[14px] animate-spin' : 'material-symbols-outlined text-[14px]'}>
                    {statusBusyId === category.id ? 'progress_activity' : isActive ? 'block' : 'check_circle'}
                  </span>
                  {isActive ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        )}
        {rowError && (
          <p className="category-row-error mt-2 text-[11px] text-rose-600 flex items-start gap-1">
            <span aria-hidden="true" className="material-symbols-outlined text-[13px]">error</span>
            <span>{rowError}</span>
          </p>
        )}
      </li>
    )
  }

  function renderList() {
    if (!items) {
      if (loadError) {
        return (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span aria-hidden="true" className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load categories</p>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={reload} type="button">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-slate-500">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        )
      }
      return (
        <div className="py-10 text-center text-xs text-slate-500">
          <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-slate-400 animate-spin block mx-auto mb-2 w-fit">progress_activity</span>
          Loading categories...
        </div>
      )
    }
    return (
      <>
        {loadError && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">error</span>
              {loadError}
            </span>
            <button className="font-semibold underline hover:text-rose-800 shrink-0" onClick={reload} type="button">
              Retry
            </button>
          </div>
        )}
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span aria-hidden="true" className="material-symbols-outlined text-xl">category</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">No categories yet</p>
            <p className="text-xs text-slate-500 mt-1">Create your first category above to classify products.</p>
          </div>
        ) : (
          <ul className={isLoading ? 'space-y-2 opacity-70 transition-opacity' : 'space-y-2'} id="categoriesList">
            {items.map(renderRow)}
          </ul>
        )}
      </>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity"
      id="categoriesDrawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div aria-labelledby="categoriesDrawerHeading" aria-modal="true" className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-y-auto" role="dialog">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Catalog Setup</span>
            <h3 className="text-base font-bold text-slate-900" id="categoriesDrawerHeading">Categories</h3>
          </div>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose} title="Close categories" type="button">
            <span aria-hidden="true" className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* New category */}
        <form className="p-6 space-y-3 text-xs border-b border-slate-200/80" id="categoryForm" noValidate onSubmit={handleCreate}>
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2" id="categoryFormError">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">error</span>
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="categoryFormName">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              className={INPUT_CLASS}
              id="categoryFormName"
              maxLength={NAME_MAX}
              onChange={(e) => {
                setNewName(e.target.value)
                setFormError(null)
              }}
              placeholder="e.g. Raw Materials"
              required
              type="text"
              value={newName}
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="categoryFormDescription">Description</label>
            <input
              className={INPUT_CLASS}
              id="categoryFormDescription"
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => {
                setNewDescription(e.target.value)
                setFormError(null)
              }}
              placeholder="Description (optional)"
              type="text"
              value={newDescription}
            />
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-60" disabled={isCreating} type="submit">
              <span aria-hidden="true" className={isCreating ? 'material-symbols-outlined text-[16px] animate-spin' : 'material-symbols-outlined text-[16px]'}>{isCreating ? 'progress_activity' : 'add'}</span>
              <span>{isCreating ? 'Creating...' : 'Create Category'}</span>
            </button>
          </div>
        </form>

        {/* All categories (active + inactive) */}
        <div className="p-6 flex-1 text-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">All Categories</span>
            {items && <span className="text-[11px] text-slate-400">{`${items.length} ${items.length === 1 ? 'category' : 'categories'}`}</span>}
          </div>
          {renderList()}
        </div>
      </div>
    </div>
  )
}
