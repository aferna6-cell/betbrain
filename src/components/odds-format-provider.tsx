'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { americanToDecimal } from '@/lib/odds'

type OddsFormat = 'american' | 'decimal'

interface OddsFormatContextValue {
  format: OddsFormat
  toggle: () => void
  formatPrice: (american: number | null) => string
}

const OddsFormatContext = createContext<OddsFormatContextValue>({
  format: 'american',
  toggle: () => {},
  formatPrice: () => '—',
})

const STORAGE_KEY = 'betbrain-odds-format'

function readStoredFormat(): OddsFormat {
  if (typeof window === 'undefined') return 'american'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'decimal' ? 'decimal' : 'american'
}

export function OddsFormatProvider({ children }: { children: ReactNode }) {
  const [format, setFormat] = useState<OddsFormat>(readStoredFormat)

  const toggle = useCallback(() => {
    setFormat((prev) => {
      const next = prev === 'american' ? 'decimal' : 'american'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const formatPrice = useCallback(
    (american: number | null): string => {
      if (american === null) return '—'
      if (format === 'decimal') {
        return americanToDecimal(american).toFixed(2)
      }
      return american > 0 ? `+${american}` : `${american}`
    },
    [format]
  )

  return (
    <OddsFormatContext.Provider value={{ format, toggle, formatPrice }}>
      {children}
    </OddsFormatContext.Provider>
  )
}

export function useOddsFormat() {
  return useContext(OddsFormatContext)
}

/**
 * Small toggle button for switching between American and Decimal odds.
 * Place in the dashboard nav or any odds display area.
 */
export function OddsFormatToggle() {
  const { format, toggle } = useOddsFormat()

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-border px-2 py-1 text-xs font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title={`Switch to ${format === 'american' ? 'decimal' : 'American'} odds`}
    >
      {format === 'american' ? 'US' : 'DEC'}
    </button>
  )
}
