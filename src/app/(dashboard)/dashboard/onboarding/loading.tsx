export default function OnboardingLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div>
        <div className="h-9 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-[480px] max-w-full animate-pulse rounded bg-muted" />
      </div>

      {/* Controls row skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Mock email card skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Chrome bar */}
        <div className="border-b border-border bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-muted" />
            <div className="h-3 w-3 rounded-full bg-muted" />
            <div className="h-3 w-3 rounded-full bg-muted" />
          </div>
        </div>

        {/* Metadata rows skeleton */}
        <div className="border-b border-border px-6 py-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div
                className="h-4 animate-pulse rounded bg-muted"
                style={{ width: `${[160, 200, 280, 320][i]}px` }}
              />
            </div>
          ))}
        </div>

        {/* Body skeleton */}
        <div className="px-6 py-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-px w-full bg-border" />
          <div className="h-7 w-72 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div
                  className="h-4 animate-pulse rounded bg-muted"
                  style={{ width: i % 2 === 0 ? '85%' : '92%' }}
                />
              </div>
            ))}
          </div>
          <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-px w-full bg-border" />
          <div className="space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Footer row skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}
