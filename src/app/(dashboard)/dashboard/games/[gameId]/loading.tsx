export default function GameDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link + header skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-3">
          <div className="h-5 w-12 animate-pulse rounded bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 border-b border-border pb-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-t-md bg-muted" />
        ))}
      </div>

      {/* Odds table skeleton */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 border-b border-border bg-muted/30 px-4 py-3">
          {['Bookmaker', 'Home ML', 'Away ML', 'Spread'].map((_, i) => (
            <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Line movement chart skeleton */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded bg-muted" />
      </div>

      {/* AI analysis panel skeleton */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-1">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
