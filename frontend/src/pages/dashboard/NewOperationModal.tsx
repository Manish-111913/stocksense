import { useNavigate } from 'react-router'
import { ROUTES } from '../../routes.ts'

interface NewOperationModalProps {
  isOpen: boolean
  onClose: () => void
}

// Each option opens the real creation flow; nothing is created from here
const OPTIONS: { label: string; description: string; icon: string; iconClassName: string; to: string }[] = [
  { label: 'Receipt', description: 'Receive incoming goods from a supplier', icon: 'move_to_inbox', iconClassName: 'material-symbols-outlined text-[20px] text-secondary', to: ROUTES.receiptNew },
  { label: 'Delivery Order', description: 'Ship outgoing goods to a customer', icon: 'local_shipping', iconClassName: 'material-symbols-outlined text-[20px] text-primary', to: ROUTES.deliveries },
  { label: 'Internal Transfer', description: 'Move stock between locations', icon: 'sync_alt', iconClassName: 'material-symbols-outlined text-[20px] text-tertiary', to: ROUTES.transfers },
  { label: 'Stock Adjustment', description: 'Reconcile recorded stock with a physical count', icon: 'tune', iconClassName: 'material-symbols-outlined text-[20px] text-on-surface-variant', to: ROUTES.adjustments },
  { label: 'Product', description: 'Add a new product to the catalog', icon: 'add_box', iconClassName: 'material-symbols-outlined text-[20px] text-primary', to: ROUTES.productNew },
]

export function NewOperationModal({ isOpen, onClose }: NewOperationModalProps) {
  const navigate = useNavigate()

  function open(to: string) {
    onClose()
    navigate(to)
  }

  return (
    <div className={isOpen ? 'fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4' : 'hidden fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4'} id="newOpModal" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-lg p-space-lg space-y-space-base animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Record New Inventory Operation</h3>
          <button className="text-on-surface-variant hover:text-on-surface" id="closeNewOpModal" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="space-y-space-sm font-body-sm text-body-sm">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Operation Type</label>
          {OPTIONS.map((option) => (
            <button className="w-full flex items-center gap-space-md bg-surface-container-low hover:bg-surface-container text-on-surface p-space-md rounded-xl text-left transition-all" key={option.label} onClick={() => open(option.to)} type="button">
              <span className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0">
                <span className={option.iconClassName}>{option.icon}</span>
              </span>
              <span className="flex-1">
                <span className="block font-label-md text-label-md font-semibold text-on-surface">{option.label}</span>
                <span className="block font-body-sm text-body-sm text-on-surface-variant">{option.description}</span>
              </span>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-space-sm pt-2">
          <button className="px-4 py-2 bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl hover:bg-surface-container transition-all" id="cancelOpModal" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
