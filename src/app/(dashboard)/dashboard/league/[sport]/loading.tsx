export default function LeagueLoading() {
  return (
    <div className="space-y-6">
      {/* Back link + heading skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
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
