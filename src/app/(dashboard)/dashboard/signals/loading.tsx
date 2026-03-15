export default function SignalsLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      {/* Signal cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-4">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 animate-pulse rounded bg-muted" />
                <div className="h-5 w-36 animate-pulse rounded bg-muted" />
                <div className="h-5 w-4 animate-pulse rounded bg-muted" />
                <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
          </div>

          {/* Signal indicators row */}
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-6 w-28 animate-pulse rounded-full bg-muted" />
            ))}
          </div>

          {/* Summary text lines */}
          <div className="space-y-1.5">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>

          {/* Action button */}
          <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  )
}
