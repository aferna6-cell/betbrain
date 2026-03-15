'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Global keyboard shortcuts for power users.
 * Mount once in the dashboard layout.
 *
 * Shortcuts:
 *   / or Cmd+K — open search palette (handled by SearchPalette)
 *   g then p — go to picks
 *   g then a — go to alerts
 *   g then s — go to signals
 *   g then b — go to bankroll
 *   g then w — go to watchlist
 *   g then d — go to dashboard
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
          b: '/dashboard/bankroll',
          w: '/dashboard/watchlist',
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
