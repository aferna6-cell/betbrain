'use client'

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
      <p className="text-lg font-semibold text-red-500">Failed to load this page</p>
      {error.message && (
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      )}
      <button
        onClick={reset}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
