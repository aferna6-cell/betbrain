export default function LeaderboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
        </div>
        {/* Sort buttons */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              {Array.from({ length: 9 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50 bg-card/50">
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div
                      className="h-4 animate-pulse rounded bg-muted"
                      style={{ width: `${40 + ((i * 9 + j) % 5) * 12}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer skeleton */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="h-3 w-56 animate-pulse rounded bg-muted" />
        <div className="h-3 w-72 animate-pulse rounded bg-muted" />
        <div className="h-3 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
