export default function ApiLoading() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-[520px] max-w-full animate-pulse rounded bg-muted" />
      </div>

      {/* API Key section */}
      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      {/* Endpoints section */}
      <div className="space-y-4">
        <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-4">
            {/* Method + path */}
            <div className="flex items-center gap-3">
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              <div className="h-5 w-44 animate-pulse rounded bg-muted" />
            </div>
            {/* Description */}
            <div className="space-y-1">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            {/* Param table */}
            <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
            {/* Response block */}
            <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>

      {/* Rate limits section */}
      <div className="space-y-3">
        <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Code example section */}
      <div className="space-y-3">
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="h-28 w-full animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Pricing callout */}
      <div className="h-36 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
