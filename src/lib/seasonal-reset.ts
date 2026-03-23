/**
 * Seasonal performance reset utilities.
 *
 * Allows the user to mark a "season boundary" so picks before that date
 * are treated as historical while current season stats start fresh.
 * Historical data is preserved — only the display changes.
 *
 * Stored in localStorage — no database change needed.
 */

const STORAGE_KEY = 'betbrain-season-reset-date'

export interface SeasonBoundary {
  /** ISO date string marking the start of the current season */
  resetDate: string
  /** Human-readable label */
  label: string
}

/**
 * Get the current season reset date from localStorage.
 * Returns null if no reset has been set (all picks count).
 */
export function getSeasonResetDate(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Set a season reset date. Picks before this date are "historical".
 */
export function setSeasonResetDate(isoDate: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, isoDate)
  } catch {
    // Storage full — silently ignore
  }
}

/**
 * Clear the season reset date (show all-time stats again).
 */
export function clearSeasonResetDate(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently ignore
  }
}

interface PickForSeason {
  game_date: string
  created_at?: string
}

/**
 * Filter picks to only include those after the season reset date.
 * If no reset date is set, returns all picks.
 */
export function filterCurrentSeason<T extends PickForSeason>(
  picks: T[],
  resetDate: string | null
): T[] {
  if (!resetDate) return picks

  const boundary = new Date(resetDate).getTime()

  return picks.filter((pick) => {
    const pickDate = new Date(pick.game_date || pick.created_at || '').getTime()
    return pickDate >= boundary
  })
}

/**
 * Split picks into current season and historical.
 */
export function splitBySeason<T extends PickForSeason>(
  picks: T[],
  resetDate: string | null
): { current: T[]; historical: T[] } {
  if (!resetDate) return { current: picks, historical: [] }

  const boundary = new Date(resetDate).getTime()
  const current: T[] = []
  const historical: T[] = []

  for (const pick of picks) {
    const pickDate = new Date(pick.game_date || pick.created_at || '').getTime()
    if (pickDate >= boundary) {
      current.push(pick)
    } else {
      historical.push(pick)
    }
  }

  return { current, historical }
}

/**
 * Common season presets for quick selection.
 */
export const SEASON_PRESETS: SeasonBoundary[] = [
  { resetDate: '2025-10-22', label: 'NBA 2025-26 (Oct 22)' },
  { resetDate: '2025-09-04', label: 'NFL 2025-26 (Sep 4)' },
  { resetDate: '2026-03-27', label: 'MLB 2026 (Mar 27)' },
  { resetDate: '2025-10-07', label: 'NHL 2025-26 (Oct 7)' },
  { resetDate: new Date().toISOString().slice(0, 10), label: 'Today' },
]
