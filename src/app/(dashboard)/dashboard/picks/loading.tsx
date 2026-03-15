export default function PicksLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Stats summary row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-1.5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-7 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Add pick form skeleton */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Picks table skeleton */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 border-b border-border bg-muted/30 px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
            <div className="h-4 w-10 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
