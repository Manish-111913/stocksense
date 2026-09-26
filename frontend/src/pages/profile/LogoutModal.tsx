import { LOGOUT_PATH } from './data.ts'

type LogoutModalProps = {
  isOpen: boolean
  isLoggingOut: boolean
  onCancel: () => void
  onConfirm: () => void
}

// Logout confirmation dialog
export function LogoutModal({ isOpen, isLoggingOut, onCancel, onConfirm }: LogoutModalProps) {
  return (
    <div className={isOpen ? 'fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4' : 'fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center hidden p-4'} id="logoutModal">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 transform transition-all">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOGOUT_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 text-center">Log out of StockSense?</h3>
        <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed">
          Are you sure you want to end session <span className="font-mono text-slate-700">#SS-9821</span>? Unsaved batch approvals or transfers will remain in draft.
        </p>
        <div className="mt-6 flex items-center space-x-3">
          <button className="w-1/2 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition" id="cancelLogoutBtn" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="w-1/2 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm transition" id="confirmLogoutBtn" onClick={onConfirm} type="button">
            {isLoggingOut ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>{' '}
                Ending Session...
              </>
            ) : (
              'Confirm Log Out'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
