'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  ALL_TYPES,
  TYPE_LABELS,
  TYPE_DESCRIPTIONS,
  type NotificationPreferences,
} from '@/lib/notification-preferences'

/**
 * Notification preferences panel.
 * Toggle individual notification types, quiet hours, and desktop notifications.
 */
export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    setPrefs(loadNotificationPreferences())
  }, [])

  if (!prefs) return null

  function update(partial: Partial<NotificationPreferences>) {
    const updated = { ...prefs!, ...partial }
    setPrefs(updated)
    saveNotificationPreferences(updated)
  }

  function toggleType(type: string) {
    if (!prefs) return
    const enabledTypes = prefs.enabledTypes
    const updated: NotificationPreferences = {
      ...prefs,
      enabledTypes: {
        ...enabledTypes,
        [type]: !enabledTypes[type as keyof typeof enabledTypes],
      },
    }
    setPrefs(updated)
    saveNotificationPreferences(updated)
  }

  async function requestDesktopPermission() {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      update({ desktopNotifications: true })
    }
  }

  return (
    <div className="space-y-4">
      {/* Mute all toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Mute All Notifications</p>
          <p className="text-xs text-muted-foreground">Temporarily disable all notifications</p>
        </div>
        <button
          onClick={() => update({ muteAll: !prefs.muteAll })}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            prefs.muteAll ? 'bg-red-500' : 'bg-muted'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              prefs.muteAll ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Per-type toggles */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {ALL_TYPES.map((type) => (
          <div key={type} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{TYPE_LABELS[type]}</p>
              <p className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[type]}</p>
            </div>
            <button
              onClick={() => toggleType(type)}
              disabled={prefs.muteAll}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                prefs.enabledTypes[type] && !prefs.muteAll ? 'bg-green-500' : 'bg-muted'
              } ${prefs.muteAll ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  prefs.enabledTypes[type] && !prefs.muteAll ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Quiet Hours</p>
            <p className="text-xs text-muted-foreground">Suppress notifications during set hours</p>
          </div>
          <button
            onClick={() => {
              if (prefs.quietHoursStart !== null) {
                update({ quietHoursStart: null, quietHoursEnd: null })
              } else {
                update({ quietHoursStart: 23, quietHoursEnd: 7 })
              }
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              prefs.quietHoursStart !== null ? 'bg-blue-500' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                prefs.quietHoursStart !== null ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {prefs.quietHoursStart !== null && (
          <div className="flex items-center gap-3 text-sm">
            <label className="text-muted-foreground">From</label>
            <select
              value={prefs.quietHoursStart}
              onChange={(e) => update({ quietHoursStart: parseInt(e.target.value) })}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                </option>
              ))}
            </select>
            <label className="text-muted-foreground">to</label>
            <select
              value={prefs.quietHoursEnd ?? 7}
              onChange={(e) => update({ quietHoursEnd: parseInt(e.target.value) })}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Desktop notifications */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Desktop Notifications</p>
            <p className="text-xs text-muted-foreground">
              Get browser push notifications for important events
            </p>
          </div>
          {prefs.desktopNotifications ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => update({ desktopNotifications: false })}
            >
              Disable
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs"
              onClick={requestDesktopPermission}
            >
              Enable
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
