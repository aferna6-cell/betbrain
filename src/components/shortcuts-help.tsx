'use client'

import { useState, useEffect } from 'react'

const SHORTCUTS = [
  { keys: ['/', 'Cmd+K'], description: 'Search' },
  { keys: ['g', 'd'], description: 'Dashboard' },
  { keys: ['g', 'p'], description: 'Picks' },
  { keys: ['g', 'a'], description: 'Alerts' },
  { keys: ['g', 's'], description: 'Signals' },
  { keys: ['g', 'e'], description: '+EV Scanner' },
  { keys: ['g', 'b'], description: 'Bankroll' },
  { keys: ['g', 'w'], description: 'Watchlist' },
  { keys: ['g', 'n'], description: 'Analytics' },
  { keys: ['g', 'i'], description: 'Digest' },
  { keys: ['g', 'r'], description: 'Props' },
  { keys: ['g', 'y'], description: 'Parlay' },
  { keys: ['g', 't'], description: 'Backtesting' },
  { keys: ['g', 'l'], description: 'Leaderboard' },
  { keys: ['g', 'v'], description: 'Saved' },
  { keys: ['g', 'g'], description: 'Glossary' },
  { keys: ['g', 'o'], description: 'Profile' },
  { keys: ['?'], description: 'This help' },
]

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Esc
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.description} className="flex items-center justify-between py-0.5">
              <span className="text-xs text-muted-foreground">{s.description}</span>
              <div className="flex gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">?</kbd> to toggle
        </p>
      </div>
    </div>
  )
}
