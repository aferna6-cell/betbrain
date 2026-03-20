'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Global keyboard shortcuts for power users.
 * Mount once in the dashboard layout.
 *
 * Shortcuts:
 *   / or Cmd+K — open search palette (handled by SearchPalette)
 *   g then d — dashboard       g then e — +EV scanner
 *   g then p — picks           g then l — leaderboard
 *   g then a — alerts          g then n — analytics
 *   g then s — signals         g then i — digest
 *   g then b — bankroll        g then r — props
 *   g then w — watchlist       g then y — parlay
 *   g then v — saved analyses  g then t — backtesting
 *   g then g — glossary        g then o — profile
 */
export function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    let pendingG = false
    let gTimeout: ReturnType<typeof setTimeout> | null = null

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      const key = e.key.toLowerCase()

      // "g" prefix — start the two-key sequence
      if (key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (pendingG) return
        pendingG = true
        gTimeout = setTimeout(() => { pendingG = false }, 1000)
        return
      }

      // Second key after "g"
      if (pendingG) {
        pendingG = false
        if (gTimeout) clearTimeout(gTimeout)

        const routes: Record<string, string> = {
          d: '/dashboard',
          p: '/dashboard/picks',
          a: '/dashboard/alerts',
          s: '/dashboard/signals',
          e: '/dashboard/ev',
          b: '/dashboard/bankroll',
          w: '/dashboard/watchlist',
          v: '/dashboard/saved',
          i: '/dashboard/digest',
          r: '/dashboard/props',
          y: '/dashboard/parlay',
          t: '/dashboard/backtesting',
          l: '/dashboard/leaderboard',
          n: '/dashboard/analytics',
          g: '/dashboard/glossary',
          o: '/dashboard/profile',
        }

        if (routes[key]) {
          e.preventDefault()
          router.push(routes[key])
        }
        return
      }

      // "/" to open search (alias for Cmd+K, SearchPalette handles Cmd+K itself)
      if (key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        // Dispatch the same Cmd+K event that SearchPalette listens for
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}
