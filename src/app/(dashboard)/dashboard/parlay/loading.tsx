export default function ParlayLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-end gap-2 rounded-md border border-border bg-muted/30 p-3"
          >
            <div className="flex-1 space-y-1">
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
            <div className="w-24 space-y-1">
              <div className="h-3 w-8 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
            <div className="w-24 space-y-1">
              <div className="h-3 w-10 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
    </div>
  )
}
