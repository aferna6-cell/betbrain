'use client'

import { useOddsFormat } from '@/components/odds-format-provider'

/**
 * Client component that displays odds in the user's preferred format.
 * Reads from OddsFormatProvider context. Falls back to American if
 * used outside the provider (e.g., public pages).
 */
export function OddsDisplay({
  odds,
  className,
}: {
  odds: number | null
  className?: string
}) {
  const { formatPrice } = useOddsFormat()
  return <span className={className}>{formatPrice(odds)}</span>
}
