'use client'

import Link from 'next/link'

function isEnvError(message?: string): boolean {
  return !!message?.includes('Missing required environment variable')
}

function isSchemaError(message?: string): boolean {
  return !!message?.includes('relation') && !!message?.includes('does not exist')
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const envMissing = isEnvError(error.message)
  const schemaMissing = isSchemaError(error.message)
  const isSetupIssue = envMissing || schemaMissing

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
        <span className="text-2xl font-bold text-muted-foreground">
          {isSetupIssue ? '?' : '!'}
        </span>
      </div>

      <h1 className="mb-2 text-2xl font-bold">
        {isSetupIssue ? 'Setup Required' : 'Something went wrong'}
      </h1>

      {isSetupIssue ? (
        <div className="mb-6 max-w-md space-y-2">
          <p className="text-sm text-muted-foreground">
            {envMissing
              ? 'BetBrain needs environment variables to connect to its services.'
              : 'Database tables are missing. Apply Supabase migrations 001-008 to set up the schema.'}
            {' '}Check the deployment checklist for setup instructions.
          </p>
          <p className="font-mono text-xs text-yellow-500">
            {error.message}
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
