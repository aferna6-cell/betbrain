export default function SavedLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                {/* Sport badge + game id */}
                <div className="flex items-center gap-2">
                  <div className="h-5 w-10 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-44 animate-pulse rounded bg-muted" />
                </div>
                {/* Meta badges row */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
                {/* Summary lines */}
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                {/* Note area */}
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-14 animate-pulse rounded-md bg-muted" />
                <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
