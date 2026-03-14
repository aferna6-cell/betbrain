'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <p className="mb-2 font-mono text-8xl font-bold text-muted-foreground/30">
        404
      </p>
      <h1 className="mb-3 text-2xl font-bold">Page not found</h1>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
