/**
 * Shared display formatting helpers.
 * Pure functions — no side effects, no external dependencies.
 */

/** Tailwind text colors for risk levels. */
export const RISK_COLORS: Record<string, string> = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-red-500',
} as const

/**
 * Format a game time with smart "Today"/"Tomorrow" labels.
 * Falls back to "Mon, Mar 14, 7:30 PM" format for other dates.
 */
export function formatGameTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (isToday) return `Today ${time}`
  if (isTomorrow) return `Tomorrow ${time}`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format a game time with weekday — "Sat, Mar 14, 7:30 PM".
 * No today/tomorrow detection, always shows full date.
 */
export function formatGameTimeFull(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
