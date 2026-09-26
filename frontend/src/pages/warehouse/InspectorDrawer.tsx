import type { Warehouse, WarehouseLocation } from '../../api/types.ts'
import { formatDate, plural } from './data.ts'

const DRAWER = 'w-full xl:w-[440px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col gap-4 shrink-0 transition-all duration-300'
const LOCATION_ROW = 'flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70'
const LOCATION_ROW_LAST = 'flex items-center justify-between gap-2'
const ICON_BTN = 'p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

type InspectorDrawerProps = {
  warehouse: Warehouse
  isTopWarehouse: boolean
  isManager: boolean
  /** Id of the warehouse / location whose status change is in flight */
  busyId: string | null
  onClose: () => void
  onEdit: () => void
  onToggleStatus: () => void
  onAddLocation: () => void
  onEditLocation: (location: WarehouseLocation) => void
  onToggleLocation: (location: WarehouseLocation) => void
}

// Right slide-over / verification panel for the selected warehouse
export function InspectorDrawer({ warehouse, isTopWarehouse, isManager, busyId, onClose, onEdit, onToggleStatus, onAddLocation, onEditLocation, onToggleLocation }: InspectorDrawerProps) {
  const isActive = warehouse.status === 'ACTIVE'
  const locations = warehouse.locations

  return (
    <div className={DRAWER} id="inspectorDrawer">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={isActive ? 'material-symbols-outlined text-[18px] text-indigo-600' : 'material-symbols-outlined text-[18px] text-slate-400'}>warehouse</span>
            <h3 className="text-base font-mono font-bold text-slate-900 break-all">{`#${warehouse.code}`}</h3>
            {isActive ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">Active</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">Inactive</span>
            )}
            {isTopWarehouse && <span className="material-symbols-outlined text-[14px] text-amber-500" title="Primary hub (most SKUs stored)">star</span>}
          </div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{warehouse.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 break-words">{warehouse.description || 'No address or notes'}</div>
        </div>
        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose} title="Close Panel" type="button">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {/* Operational Status Box */}
      {isActive ? (
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[15px]">check</span>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-900">Facility Operational</div>
            <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
              {`${warehouse.activeLocationCount} of ${plural(warehouse.locationCount, 'location')} active · ${warehouse.productCount > 0 ? `${plural(warehouse.productCount, 'SKU')} stored.` : 'No stock yet.'}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[15px]">block</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Facility Inactive</div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">Activate this warehouse to add locations or receive stock.</p>
          </div>
        </div>
      )}
      {/* Locations Breakdown Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{`Locations Breakdown (${warehouse.locationCount})`}</span>
          {isManager && (
            <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!isActive} onClick={onAddLocation} title={isActive ? undefined : 'Activate the warehouse first'} type="button">
              <span className="material-symbols-outlined text-[13px]">add</span>
              Add Location
            </button>
          )}
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          {locations.length === 0 ? (
            <div className="py-4 text-center">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-[18px]">shelves</span>
              </div>
              <p className="text-xs font-semibold text-slate-700">No locations yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{isManager ? 'Add racks, bins or bays to store stock in this warehouse.' : 'An inventory manager can add locations to this warehouse.'}</p>
            </div>
          ) : (
            locations.map((location, index) => {
              const locationActive = location.status === 'ACTIVE'
              return (
                <div className={index === locations.length - 1 ? LOCATION_ROW_LAST : LOCATION_ROW} key={location.id}>
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={locationActive ? 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5' : 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 mt-0.5'}>
                      <span className="material-symbols-outlined text-[16px]">{locationActive ? 'shelves' : 'block'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className={locationActive ? 'text-xs font-semibold text-slate-900 break-words' : 'text-xs font-semibold text-slate-500 break-words'}>{location.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 break-all">{`Code: ${location.code}`}</div>
                      <div className={locationActive ? 'text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1' : 'text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1'}>
                        <span className={locationActive ? 'w-1.5 h-1.5 rounded-full bg-emerald-500' : 'w-1.5 h-1.5 rounded-full bg-slate-400'} />
                        {locationActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={locationActive ? 'px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-semibold text-xs shrink-0' : 'px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-mono font-semibold text-xs shrink-0'}>
                      {plural(location.productCount, 'SKU')}
                    </span>
                    {isManager && (
                      <>
                        <button className={ICON_BTN} onClick={() => onEditLocation(location)} title="Edit Location" type="button">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          className={ICON_BTN}
                          disabled={busyId === location.id || (!locationActive && !isActive)}
                          onClick={() => onToggleLocation(location)}
                          title={locationActive ? 'Deactivate Location' : isActive ? 'Activate Location' : 'Activate the warehouse first'}
                          type="button"
                        >
                          <span className={busyId === location.id ? 'material-symbols-outlined text-[16px] animate-spin' : locationActive ? 'material-symbols-outlined text-[16px] text-emerald-600' : 'material-symbols-outlined text-[16px]'}>
                            {busyId === location.id ? 'progress_activity' : locationActive ? 'toggle_on' : 'toggle_off'}
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
      {/* Details Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Warehouse Details</span>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Created By</span>
            <span className="font-medium text-slate-900 flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[14px] text-indigo-600">person</span>
              {warehouse.createdBy.fullName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Address / Notes</span>
            <span className="font-medium text-slate-900 text-right truncate max-w-[220px]" title={warehouse.description ?? undefined}>{warehouse.description || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Stored SKUs</span>
            <span className="font-mono font-medium text-slate-900">{warehouse.productCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Created</span>
            <span className="font-mono font-medium text-slate-900">{formatDate(warehouse.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Last Updated</span>
            <span className="font-mono font-medium text-slate-900">{formatDate(warehouse.updatedAt)}</span>
          </div>
        </div>
      </div>
      {/* Drawer Actions */}
      {isManager && (
        <div className="flex items-center gap-2">
          <button className="flex-1 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1" onClick={onEdit} type="button">
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Edit Warehouse
          </button>
          <button
            className={isActive ? 'flex-1 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-60' : 'flex-1 py-2 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-60'}
            disabled={busyId === warehouse.id}
            onClick={onToggleStatus}
            type="button"
          >
            <span className={busyId === warehouse.id ? 'material-symbols-outlined text-[14px] animate-spin' : 'material-symbols-outlined text-[14px]'}>{busyId === warehouse.id ? 'progress_activity' : isActive ? 'block' : 'check_circle'}</span>
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" onClick={onClose} type="button">
          Close
        </button>
        {isManager && (
          <button className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isActive} onClick={onAddLocation} title={isActive ? undefined : 'Activate the warehouse first'} type="button">
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Add Location to Hub</span>
          </button>
        )}
      </div>
    </div>
  )
}
