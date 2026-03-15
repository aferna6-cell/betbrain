export default function AlertsLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      {/* Create alert form skeleton */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      {/* Active alerts list skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-10 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
