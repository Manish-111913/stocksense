import { useNavigate } from 'react-router'
import { useAuthFlow } from '../context/authFlow.ts'

// Route / success transition modal; Continue goes to the announced route
export function RouteModal() {
  const navigate = useNavigate()
  const { routeModal, closeRouteModal } = useAuthFlow()
  if (!routeModal) return null

  function handleContinue() {
    if (!routeModal) return
    closeRouteModal()
    navigate(routeModal.route)
  }

  const { route, title, description, isSuccess } = routeModal

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" id="routeModal">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <div
          className={
            isSuccess
              ? 'w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3'
              : 'w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3'
          }
          id="modalIconContainer"
        >
          {isSuccess ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          )}
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1" id="modalTitle">{title}</h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed" id="modalDesc">
          <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-medium text-[11px] mb-2">{route}</span>
          <br />
          {description}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors" id="modalActionBtn" onClick={handleContinue} type="button">
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
