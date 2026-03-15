export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6 space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* League filter skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-16 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Game cards grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex justify-between">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="border-t border-border pt-3 space-y-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
              <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
