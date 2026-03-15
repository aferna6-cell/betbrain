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

/** Format just the time portion — "7:30 PM". */
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Format as short date with time — "Mar 14, 7:30 PM". */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Format as short date with year — "Mar 14, 2026". */
export function formatDateShort(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

/** Text color for profit/loss values — green for positive, red for negative. */
export function profitColor(value: number): string {
  if (value > 0) return 'text-green-500'
  if (value < 0) return 'text-red-500'
  return ''
}

/** Text color for win rate — green above 55%, red below 50%. */
export function winRateColor(value: number): string {
  if (value > 55) return 'text-green-500'
  if (value < 50) return 'text-red-500'
  return ''
}

/** Tailwind text colors for impact magnitude levels. */
export const MAGNITUDE_COLORS: Record<string, string> = {
  large: 'text-red-500',
  moderate: 'text-yellow-500',
  small: 'text-green-500',
} as const

/**
 * Relative time string — "2m ago", "1h ago", "3d ago".
 * Returns null if the input is falsy.
 */
export function timeAgo(isoString: string | null | undefined): string | null {
  if (!isoString) return null
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
