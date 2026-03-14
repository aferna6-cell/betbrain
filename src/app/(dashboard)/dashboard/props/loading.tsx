export default function PropsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-52 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-96 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>

      <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
    </div>
  )
}
