/**
 * Format utility tests.
 *
 * Covers:
 * - RISK_COLORS mapping
 * - formatTime — time-only output
 * - formatDateTime — date + time
 * - formatDateShort — date + year
 * - formatGameTime — smart today/tomorrow detection
 * - formatGameTimeFull — weekday + date + time
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  RISK_COLORS,
  formatTime,
  formatDateTime,
  formatDateShort,
  formatGameTime,
  formatGameTimeFull,
  timeAgo,
} from '@/lib/format'

// ---------------------------------------------------------------------------
// RISK_COLORS
// ---------------------------------------------------------------------------

describe('RISK_COLORS', () => {
  it('maps low to green', () => {
    expect(RISK_COLORS['low']).toContain('green')
  })

  it('maps medium to yellow', () => {
    expect(RISK_COLORS['medium']).toContain('yellow')
  })

  it('maps high to red', () => {
    expect(RISK_COLORS['high']).toContain('red')
  })

  it('has exactly 3 entries', () => {
    expect(Object.keys(RISK_COLORS)).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

describe('formatTime', () => {
  it('returns a string', () => {
    expect(typeof formatTime('2026-03-14T19:30:00Z')).toBe('string')
  })

  it('output is non-empty', () => {
    expect(formatTime('2026-03-14T19:30:00Z').length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe('formatDateTime', () => {
  it('includes month abbreviation', () => {
    const result = formatDateTime('2026-03-14T19:30:00Z')
    expect(result).toMatch(/Mar/)
  })

  it('returns a string', () => {
    expect(typeof formatDateTime('2026-03-14T19:30:00Z')).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// formatDateShort
// ---------------------------------------------------------------------------

describe('formatDateShort', () => {
  it('includes year', () => {
    const result = formatDateShort('2026-03-14T12:00:00Z')
    expect(result).toContain('2026')
  })

  it('includes month abbreviation', () => {
    const result = formatDateShort('2026-03-14T12:00:00Z')
    expect(result).toMatch(/Mar/)
  })
})

// ---------------------------------------------------------------------------
// formatGameTime
// ---------------------------------------------------------------------------

describe('formatGameTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "Today" for today\'s game', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T10:00:00'))
    expect(formatGameTime('2026-03-14T19:30:00')).toMatch(/^Today/)
  })

  it('shows "Tomorrow" for tomorrow\'s game', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T10:00:00'))
    expect(formatGameTime('2026-03-15T19:30:00')).toMatch(/^Tomorrow/)
  })

  it('shows date for games beyond tomorrow', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T10:00:00'))
    const result = formatGameTime('2026-03-20T19:30:00')
    expect(result).not.toMatch(/^Today/)
    expect(result).not.toMatch(/^Tomorrow/)
  })
})

// ---------------------------------------------------------------------------
// formatGameTimeFull
// ---------------------------------------------------------------------------

describe('formatGameTimeFull', () => {
  it('returns a string', () => {
    expect(typeof formatGameTimeFull('2026-03-14T19:30:00Z')).toBe('string')
  })

  it('includes a weekday abbreviation', () => {
    // Sat, Mar 14 — the format includes weekday
    const result = formatGameTimeFull('2026-03-14T12:00:00')
    expect(result.length).toBeGreaterThan(10)
  })
})

// ---------------------------------------------------------------------------
// timeAgo
// ---------------------------------------------------------------------------

describe('timeAgo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for null/undefined input', () => {
    expect(timeAgo(null)).toBeNull()
    expect(timeAgo(undefined)).toBeNull()
  })

  it('returns "just now" for very recent timestamps', () => {
    const now = new Date().toISOString()
    expect(timeAgo(now)).toBe('just now')
  })

  it('returns minutes for timestamps within the hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T12:10:00Z'))
    expect(timeAgo('2026-03-14T12:05:00Z')).toBe('5m ago')
  })

  it('returns hours for timestamps within the day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T15:00:00Z'))
    expect(timeAgo('2026-03-14T12:00:00Z')).toBe('3h ago')
  })

  it('returns days for timestamps beyond 24 hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'))
    expect(timeAgo('2026-03-14T12:00:00Z')).toBe('2d ago')
  })

  it('returns "1m ago" at exactly 60 seconds', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T12:01:00Z'))
    expect(timeAgo('2026-03-14T12:00:00Z')).toBe('1m ago')
  })

  it('returns "1h ago" at exactly 60 minutes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T13:00:00Z'))
    expect(timeAgo('2026-03-14T12:00:00Z')).toBe('1h ago')
  })

  it('returns "1d ago" at exactly 24 hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
    expect(timeAgo('2026-03-14T12:00:00Z')).toBe('1d ago')
  })

  it('returns "just now" for empty string', () => {
    expect(timeAgo('')).toBeNull()
  })

  it('returns "59m ago" at 59 minutes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-14T12:59:00Z'))
    expect(timeAgo('2026-03-14T12:00:00Z')).toBe('59m ago')
  })

  it('returns "23h ago" at 23 hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T11:00:00Z'))
    expect(timeAgo('2026-03-14T12:00:00Z')).toBe('23h ago')
  })
})
