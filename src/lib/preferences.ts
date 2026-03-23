/**
 * User preferences stored in localStorage.
 * Personal tool — no server persistence needed.
 */

const PREFIX = 'betbrain-pref-'

export function getPreference(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(`${PREFIX}${key}`)
  } catch {
    return null
  }
}

export function setPreference(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${PREFIX}${key}`, value)
  } catch {
    // Storage full or disabled — silently ignore
  }
}

export function removePreference(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${PREFIX}${key}`)
  } catch {
    // Silently ignore
  }
}

// ---------------------------------------------------------------------------
// Specific preference keys
// ---------------------------------------------------------------------------

export const PREF_KEYS = {
  PREFERRED_BOOKMAKER: 'preferred-bookmaker',
} as const

export function getPreferredBookmaker(): string | null {
  return getPreference(PREF_KEYS.PREFERRED_BOOKMAKER)
}

export function setPreferredBookmaker(bookmaker: string | null): void {
  if (bookmaker) {
    setPreference(PREF_KEYS.PREFERRED_BOOKMAKER, bookmaker)
  } else {
    removePreference(PREF_KEYS.PREFERRED_BOOKMAKER)
  }
}
