export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account info card */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-1">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-1">
              <div className="h-3 w-14 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Subscription card */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="h-3 w-10 animate-pulse rounded bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-1">
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Pick tracker record card */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-44 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Display name form card */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4 lg:col-span-2">
          <div className="space-y-1">
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
