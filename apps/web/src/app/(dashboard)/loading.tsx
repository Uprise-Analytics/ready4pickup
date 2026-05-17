export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-7 w-40 bg-slate-200 rounded-md" />
            <div className="h-4 w-24 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Primary content block */}
      <div className="h-52 w-full bg-slate-100 rounded-xl" />

      {/* Table / card rows */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="h-8 flex-1 bg-slate-100 rounded-md" />
          <div className="h-8 w-28 bg-slate-100 rounded-md" />
        </div>
        <div className="divide-y divide-slate-50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 bg-slate-100 rounded" />
                <div className="h-3 w-52 bg-slate-50 rounded" />
              </div>
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
              <div className="h-5 w-14 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
