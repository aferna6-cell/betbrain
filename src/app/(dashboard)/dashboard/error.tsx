'use client'

import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
        <span className="text-2xl font-bold text-muted-foreground">!</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>

      {error.message && (
        <p className="mb-1 max-w-md text-sm text-muted-foreground">
          {error.message}
        </p>
      )}

      {error.digest && (
        <p className="mb-6 font-mono text-xs text-muted-foreground/60">
          Error ID: {error.digest}
        </p>
      )}

      {!error.digest && <div className="mb-6" />}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
