'use client'

import { useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'betbrain-onboarding-dismissed'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href: string
  linkText: string
}

const ITEMS: ChecklistItem[] = [
  {
    id: 'browse',
    label: 'Browse today\'s games',
    description: 'See odds from 20+ bookmakers across NBA, NFL, MLB, NHL',
    href: '/dashboard',
    linkText: 'View dashboard',
  },
  {
    id: 'analyze',
    label: 'Run your first AI analysis',
    description: 'Click "Analyze" on any game card — 3 free per day',
    href: '/dashboard',
    linkText: 'Find a game',
  },
  {
    id: 'alert',
    label: 'Set a line movement alert',
    description: 'Get notified when odds cross your threshold',
    href: '/dashboard/alerts',
    linkText: 'Go to alerts',
  },
  {
    id: 'pick',
    label: 'Log your first pick',
    description: 'Track your record, ROI, and closing line value',
    href: '/dashboard/picks',
    linkText: 'Log a pick',
  },
]

function readDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function readCompleted(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const set = new Set<string>()
  for (const item of ITEMS) {
    if (localStorage.getItem(`betbrain-onboarding-${item.id}`)) set.add(item.id)
  }
  return set
}

export function OnboardingChecklist() {
  // Lazy initializers read from localStorage once on mount (client only)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [completed, setCompleted] = useState(readCompleted)

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
  }

  function handleComplete(id: string) {
    localStorage.setItem(`betbrain-onboarding-${id}`, 'true')
    setCompleted((prev) => new Set(prev).add(id))
  }

  if (dismissed) return null

  const progress = completed.size
  const total = ITEMS.length

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Welcome to BetBrain</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started in 4 steps — {progress}/{total} complete
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-label="Dismiss onboarding"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-blue-500/10">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all"
          style={{ width: `${(progress / total) * 100}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => {
          const done = completed.has(item.id)
          return (
            <div
              key={item.id}
              className={`rounded-md border p-3 ${
                done
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm ${done ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                  {done ? '\u2713' : '\u2022'} {item.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              {!done && (
                <Link
                  href={item.href}
                  onClick={() => handleComplete(item.id)}
                  className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {item.linkText} &rarr;
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {progress === total && (
        <div className="mt-4 text-center">
          <p className="text-sm text-green-500 font-medium">All done! You&apos;re ready to find value.</p>
          <button
            onClick={handleDismiss}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Close checklist
          </button>
        </div>
      )}
    </div>
  )
}
