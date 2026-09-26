import { useNavigate } from 'react-router'
import { ROUTES } from '../../../routes.ts'

// Receipt not found (404 / malformed id) error state
export function ReceiptNotFound() {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-lg mx-auto my-8 space-y-4" id="state-notfound-content">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-100">
        <span className="material-symbols-outlined text-3xl">receipt_long</span>
      </div>
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">404 · Receipt Missing</span>
      <h2 className="text-xl font-bold text-slate-900">Receipt Not Found</h2>
      <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">The receipt you are looking for does not exist or the link is incorrect. Return to the receipts list to find it.</p>
      <div className="pt-3">
        <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={() => navigate(ROUTES.receipts)}>
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Receipts</span>
        </button>
      </div>
    </div>
  )
}
