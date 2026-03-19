export default function EVScannerLoading() {
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-2">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>

      {/* Summary badges */}
      <div className="flex gap-3">
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>

      {/* EV cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <div className="h-5 w-12 animate-pulse rounded bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="rounded-md border border-border/50 p-2 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="flex gap-4">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
