'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { americanToDecimal, americanToFractional } from '@/lib/odds'

type OddsFormat = 'american' | 'decimal' | 'fractional'

interface OddsFormatContextValue {
  format: OddsFormat
  toggle: () => void
  formatPrice: (american: number | null) => string
}

const OddsFormatContext = createContext<OddsFormatContextValue>({
  format: 'american',
  toggle: () => {},
  formatPrice: (american) => {
    if (american === null) return '—'
    return american > 0 ? `+${american}` : `${american}`
  },
})

const STORAGE_KEY = 'betbrain-odds-format'

const VALID_FORMATS: OddsFormat[] = ['american', 'decimal', 'fractional']

function readStoredFormat(): OddsFormat {
  if (typeof window === 'undefined') return 'american'
  const stored = localStorage.getItem(STORAGE_KEY)
  return VALID_FORMATS.includes(stored as OddsFormat) ? (stored as OddsFormat) : 'american'
}

export function OddsFormatProvider({ children }: { children: ReactNode }) {
  const [format, setFormat] = useState<OddsFormat>(readStoredFormat)

  const toggle = useCallback(() => {
    setFormat((prev) => {
      const idx = VALID_FORMATS.indexOf(prev)
      const next = VALID_FORMATS[(idx + 1) % VALID_FORMATS.length]
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
      if (format === 'fractional') {
        return americanToFractional(american)
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
const FORMAT_LABELS: Record<OddsFormat, string> = {
  american: 'US',
  decimal: 'DEC',
  fractional: 'FRAC',
}

const FORMAT_NEXT: Record<OddsFormat, string> = {
  american: 'decimal',
  decimal: 'fractional',
  fractional: 'American',
}

export function OddsFormatToggle() {
  const { format, toggle } = useOddsFormat()

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-border px-2 py-1 text-xs font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title={`Switch to ${FORMAT_NEXT[format]} odds`}
    >
      {FORMAT_LABELS[format]}
    </button>
  )
}
