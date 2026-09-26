// Skeleton loading state while the product is fetched
export function ProductSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" id="state-skeleton-content">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="space-y-2">
          <div className="h-3 w-48 bg-slate-200 rounded" />
          <div className="h-7 w-64 bg-slate-300 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-12 bg-slate-100 rounded-xl" />
        </div>
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="space-y-2 pt-2">
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-56 bg-slate-200 rounded" />
        <div className="space-y-3 pt-2">
          <div className="h-9 bg-slate-100 rounded" />
          <div className="h-9 bg-slate-100 rounded" />
          <div className="h-9 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  )
}
