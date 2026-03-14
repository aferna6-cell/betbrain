export default function BacktestingLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <div className="h-9 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-[480px] max-w-full animate-pulse rounded bg-muted" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>

        {/* Strategy hint bar */}
        <div className="h-8 w-full animate-pulse rounded-md bg-muted" />

        {/* Button */}
        <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}
