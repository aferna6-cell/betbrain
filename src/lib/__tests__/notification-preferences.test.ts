import { describe, it, expect } from 'vitest'
import { isNotificationEnabled, type NotificationPreferences } from '../notification-preferences'

function makePrefs(overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return {
    enabledTypes: {
      pick_resolved: true,
      alert_triggered: true,
      signal_detected: true,
      streak_badge: true,
      ev_opportunity: true,
      steam_move: true,
      regression_warning: true,
    },
    desktopNotifications: false,
    muteAll: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    ...overrides,
  }
}

describe('isNotificationEnabled', () => {
  it('returns true for all types with default prefs', () => {
    const prefs = makePrefs()
    expect(isNotificationEnabled(prefs, 'pick_resolved')).toBe(true)
    expect(isNotificationEnabled(prefs, 'steam_move')).toBe(true)
  })

  it('returns false when muteAll is true', () => {
    const prefs = makePrefs({ muteAll: true })
    expect(isNotificationEnabled(prefs, 'pick_resolved')).toBe(false)
    expect(isNotificationEnabled(prefs, 'ev_opportunity')).toBe(false)
  })

  it('returns false for disabled type', () => {
    const prefs = makePrefs({
      enabledTypes: {
        ...makePrefs().enabledTypes,
        steam_move: false,
      },
    })
    expect(isNotificationEnabled(prefs, 'steam_move')).toBe(false)
    expect(isNotificationEnabled(prefs, 'pick_resolved')).toBe(true)
  })

  it('respects quiet hours (same day range)', () => {
    const prefs = makePrefs({ quietHoursStart: 22, quietHoursEnd: 6 })
    // At 23:00 (within quiet hours)
    const lateNight = new Date('2026-03-24T23:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', lateNight)).toBe(false)

    // At 3:00 AM (within quiet hours, after midnight)
    const earlyMorning = new Date('2026-03-24T03:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', earlyMorning)).toBe(false)

    // At 14:00 (outside quiet hours)
    const afternoon = new Date('2026-03-24T14:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', afternoon)).toBe(true)
  })

  it('respects quiet hours (non-wrapping range)', () => {
    const prefs = makePrefs({ quietHoursStart: 9, quietHoursEnd: 17 })
    // At 12:00 (within quiet hours)
    const noon = new Date('2026-03-24T12:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', noon)).toBe(false)

    // At 20:00 (outside)
    const evening = new Date('2026-03-24T20:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', evening)).toBe(true)
  })

  it('returns true when quiet hours are null', () => {
    const prefs = makePrefs({ quietHoursStart: null, quietHoursEnd: null })
    const midnight = new Date('2026-03-24T00:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', midnight)).toBe(true)
  })

  it('muteAll takes precedence over everything', () => {
    const prefs = makePrefs({
      muteAll: true,
      quietHoursStart: null,
      quietHoursEnd: null,
    })
    const afternoon = new Date('2026-03-24T14:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', afternoon)).toBe(false)
  })

  it('quiet hours boundary: start hour is included, end hour is excluded', () => {
    const prefs = makePrefs({ quietHoursStart: 22, quietHoursEnd: 6 })
    // Exactly at start (22:00) - should be quiet
    const atStart = new Date('2026-03-24T22:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', atStart)).toBe(false)

    // Exactly at end (6:00) - should NOT be quiet
    const atEnd = new Date('2026-03-24T06:00:00')
    expect(isNotificationEnabled(prefs, 'pick_resolved', atEnd)).toBe(true)
  })
})
