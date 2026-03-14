'use client'

import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="mb-2 font-mono text-7xl font-bold text-muted-foreground/30">
        404
      </p>
      <h1 className="mb-3 text-2xl font-bold">Page not found</h1>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        This dashboard page doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
