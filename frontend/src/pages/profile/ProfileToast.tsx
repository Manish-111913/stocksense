import { type ToastState } from './data.ts'

const TOAST_HIDDEN = 'fixed top-5 right-5 z-50 transform transition-all duration-300 translate-y-[-120%] opacity-0 pointer-events-none'
const TOAST_VISIBLE = 'fixed top-5 right-5 z-50 transform transition-all duration-300 translate-y-0 opacity-100'
const ICON_SUCCESS = 'w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0'
const ICON_ERROR = 'w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0'

// Notification toast that slides in from the top-right corner
export function ProfileToast({ toast }: { toast: ToastState }) {
  return (
    <div className={toast.visible ? TOAST_VISIBLE : TOAST_HIDDEN} id="toastNotification">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 flex items-center space-x-3">
        <div className={toast.isError ? ICON_ERROR : ICON_SUCCESS} id="toastIcon">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d={toast.isError ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-900" id="toastTitle">{toast.title}</p>
          <p className="text-xs text-slate-600" id="toastMessage">{toast.message}</p>
        </div>
      </div>
    </div>
  )
}
