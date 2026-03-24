/**
 * Notification preferences — control which notification types to show.
 * Stored in localStorage for instant client-side access.
 */

import type { NotificationType } from './notifications'

export interface NotificationPreferences {
  /** Which notification types are enabled */
  enabledTypes: Record<NotificationType, boolean>
  /** Show desktop notifications via browser Notification API */
  desktopNotifications: boolean
  /** Mute all notifications temporarily */
  muteAll: boolean
  /** Quiet hours (24h format, e.g., 23 for 11pm) */
  quietHoursStart: number | null
  quietHoursEnd: number | null
}

const STORAGE_KEY = 'betbrain_notification_prefs'

const ALL_TYPES: NotificationType[] = [
  'pick_resolved',
  'alert_triggered',
  'signal_detected',
  'streak_badge',
  'ev_opportunity',
  'steam_move',
  'regression_warning',
]

const TYPE_LABELS: Record<NotificationType, string> = {
  pick_resolved: 'Pick Results',
  alert_triggered: 'Line Alerts',
  signal_detected: 'Smart Signals',
  streak_badge: 'Streaks & Badges',
  ev_opportunity: '+EV Opportunities',
  steam_move: 'Steam Moves',
  regression_warning: 'Regression Warnings',
}

const TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  pick_resolved: 'When your picks are resolved (win/loss/push)',
  alert_triggered: 'When a line movement alert triggers',
  signal_detected: 'When new smart signals are detected',
  streak_badge: 'When you earn streak badges',
  ev_opportunity: 'When +EV betting opportunities are found',
  steam_move: 'When sharp line movement is detected',
  regression_warning: 'When your stats show concerning regression',
}

export { ALL_TYPES, TYPE_LABELS, TYPE_DESCRIPTIONS }

/**
 * Load notification preferences with defaults.
 */
export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return getDefaultPreferences()
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultPreferences()
    const parsed = JSON.parse(raw)
    // Merge with defaults to handle new types
    return {
      ...getDefaultPreferences(),
      ...parsed,
      enabledTypes: {
        ...getDefaultPreferences().enabledTypes,
        ...(parsed.enabledTypes ?? {}),
      },
    }
  } catch {
    return getDefaultPreferences()
  }
}

/**
 * Save notification preferences.
 */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

/**
 * Check if a notification type is currently enabled.
 * Considers mute-all, quiet hours, and per-type settings.
 */
export function isNotificationEnabled(
  prefs: NotificationPreferences,
  type: NotificationType,
  now?: Date
): boolean {
  if (prefs.muteAll) return false

  // Check quiet hours
  if (prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null) {
    const current = (now ?? new Date()).getHours()
    if (prefs.quietHoursStart > prefs.quietHoursEnd) {
      // Wraps midnight: e.g., 23-7
      if (current >= prefs.quietHoursStart || current < prefs.quietHoursEnd) {
        return false
      }
    } else {
      // Same day: e.g., 22-6 doesn't wrap
      if (current >= prefs.quietHoursStart && current < prefs.quietHoursEnd) {
        return false
      }
    }
  }

  return prefs.enabledTypes[type] ?? true
}

function getDefaultPreferences(): NotificationPreferences {
  const enabledTypes: Record<string, boolean> = {}
  for (const type of ALL_TYPES) {
    enabledTypes[type] = true
  }
  return {
    enabledTypes: enabledTypes as Record<NotificationType, boolean>,
    desktopNotifications: false,
    muteAll: false,
    quietHoursStart: null,
    quietHoursEnd: null,
  }
}
