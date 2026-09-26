interface NewOperationModalProps {
  isOpen: boolean
  onClose: () => void
}

// New Operation modal prototype (clean CPQ flyout). Stays mounted while hidden, like the original, so field values persist
export function NewOperationModal({ isOpen, onClose }: NewOperationModalProps) {
  return (
    <div className={isOpen ? 'fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4' : 'hidden fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4'} id="newOpModal">
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-lg p-space-lg space-y-space-base animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Record New Inventory Operation</h3>
          <button className="text-on-surface-variant hover:text-on-surface" id="closeNewOpModal" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="space-y-space-sm font-body-sm text-body-sm">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Operation Type</label>
            <select className="w-full bg-surface-container-low text-on-surface p-2 rounded-xl outline-none focus:bg-surface-container">
              <option>Receipt (Vendor Inbound)</option>
              <option>Delivery Order (Customer Outbound)</option>
              <option>Internal Inter-Warehouse Transfer</option>
              <option>Stock Reconciliation Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Warehouse / Hub Location</label>
            <select className="w-full bg-surface-container-low text-on-surface p-2 rounded-xl outline-none focus:bg-surface-container">
              <option>Main Warehouse (WH-West)</option>
              <option>West Facility</option>
              <option>East Depot (WH-East)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Product SKU</label>
              <input className="w-full bg-surface-container-low text-on-surface p-2 rounded-xl outline-none focus:bg-surface-container font-mono" placeholder="e.g. STL-001" type="text" />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Quantity</label>
              <input className="w-full bg-surface-container-low text-on-surface p-2 rounded-xl outline-none focus:bg-surface-container font-mono" placeholder="50" type="number" />
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Reference Notes</label>
            <textarea className="w-full bg-surface-container-low text-on-surface p-2 rounded-xl outline-none focus:bg-surface-container" placeholder="Purchase Order #, Vendor Consignment, or Bill of Lading" rows={2} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-space-sm pt-2">
          <button className="px-4 py-2 bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl hover:bg-surface-container transition-all" id="cancelOpModal" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="px-4 py-2 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl shadow-sm hover:opacity-95 transition-all" id="saveOpModal" onClick={onClose} type="button">
            Create Draft Operation
          </button>
        </div>
      </div>
    </div>
  )
}
