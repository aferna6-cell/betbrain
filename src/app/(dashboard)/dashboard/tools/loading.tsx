export default function ToolsLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Converter card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-5">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />

        {/* Format radio row */}
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>

        {/* Input field */}
        <div className="space-y-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        </div>

        {/* Results rows */}
        <div className="border border-zinc-800 rounded-md px-4 space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-zinc-800 last:border-0">
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Vig calculator card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-5">
        <div className="space-y-1">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>

        {/* Two inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ))}
        </div>

        {/* Results rows */}
        <div className="border border-zinc-800 rounded-md px-4 space-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-zinc-800 last:border-0">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
