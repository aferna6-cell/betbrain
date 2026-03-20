'use client'

import { useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'betbrain-whats-new-dismissed'
const CURRENT_VERSION = '2026-03-20'

interface Update {
  title: string
  description: string
  href?: string
}

const UPDATES: Update[] = [
  {
    title: '+EV Scanner',
    description: 'Find bets where bookmaker odds beat fair market value. Includes arbitrage detection.',
    href: '/dashboard/ev',
  },
  {
    title: 'Auto-Resolve Picks',
    description: 'NBA picks now auto-resolve from final scores. No more manual win/loss entry.',
    href: '/dashboard/picks',
  },
  {
    title: 'Betting 101 Guide',
    description: 'New to betting? Learn odds, spreads, and implied probability in 5 minutes.',
    href: '/betting-101',
  },
]

export function WhatsNew() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(STORAGE_KEY) === CURRENT_VERSION
  })

  if (dismissed || UPDATES.length === 0) return null

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION)
    setDismissed(true)
  }

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-indigo-400">What&apos;s New</h3>
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      <div className="space-y-2">
        {UPDATES.map((update) => (
          <div key={update.title} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
            <div>
              {update.href ? (
                <Link href={update.href} className="text-sm font-medium hover:underline">
                  {update.title}
                </Link>
              ) : (
                <span className="text-sm font-medium">{update.title}</span>
              )}
              <p className="text-xs text-muted-foreground">{update.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
