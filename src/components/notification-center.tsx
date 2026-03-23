'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  NOTIFICATION_ICONS,
  NOTIFICATION_COLORS,
  type Notification,
  type NotificationType,
} from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Bell icon with badge (for nav bar)
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setUnread(getUnreadCount())
    // Poll every 30s for new notifications
    const interval = setInterval(() => {
      setUnread(getUnreadCount())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          // Refresh count when opening
          setUnread(getUnreadCount())
        }}
        className="relative rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          onClose={() => {
            setOpen(false)
            setUnread(getUnreadCount())
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  const refresh = useCallback(() => {
    setNotifications(getAllNotifications())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === filter)

  function handleMarkRead(id: string) {
    markAsRead(id)
    refresh()
  }

  function handleDelete(id: string) {
    deleteNotification(id)
    refresh()
  }

  function handleMarkAllRead() {
    markAllAsRead()
    refresh()
  }

  function handleClearAll() {
    if (confirm('Clear all notifications?')) {
      clearAllNotifications()
      refresh()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
          {[
            { key: 'all' as const, label: 'All' },
            { key: 'pick_resolved' as NotificationType, label: 'Picks' },
            { key: 'alert_triggered' as NotificationType, label: 'Alerts' },
            { key: 'signal_detected' as NotificationType, label: 'Signals' },
            { key: 'ev_opportunity' as NotificationType, label: '+EV' },
            { key: 'regression_warning' as NotificationType, label: 'Warnings' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 transition-colors ${
                    !n.read ? 'bg-primary/5' : ''
                  } ${NOTIFICATION_COLORS[n.type]} border-l-2`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5" aria-hidden="true">
                      {NOTIFICATION_ICONS[n.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold truncate">{n.title}</p>
                        {!n.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => {
                              handleMarkRead(n.id)
                              onClose()
                            }}
                            className="text-[10px] text-primary hover:underline"
                          >
                            View
                          </Link>
                        )}
                        {!n.read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="text-[10px] text-muted-foreground hover:text-destructive"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2">
          <Link
            href="/dashboard/notifications"
            onClick={onClose}
            className="text-xs text-primary hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Full page notifications view
// ---------------------------------------------------------------------------

export function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  const refresh = useCallback(() => {
    setNotifications(getAllNotifications())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all' as const, label: 'All' },
            { key: 'pick_resolved' as NotificationType, label: 'Picks' },
            { key: 'alert_triggered' as NotificationType, label: 'Alerts' },
            { key: 'signal_detected' as NotificationType, label: 'Signals' },
            { key: 'ev_opportunity' as NotificationType, label: '+EV' },
            { key: 'steam_move' as NotificationType, label: 'Steam' },
            { key: 'regression_warning' as NotificationType, label: 'Warnings' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { markAllAsRead(); refresh() }}>
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Clear all notifications?')) {
                clearAllNotifications()
                refresh()
              }
            }}
          >
            Clear All
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No notifications yet. They will appear here when picks resolve, alerts trigger, or signals are detected.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border bg-card p-4 transition-colors ${
                !n.read ? 'bg-primary/5 border-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{NOTIFICATION_ICONS[n.type]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.read && (
                      <Badge variant="default" className="text-[10px] h-4">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => { markAsRead(n.id); refresh() }}
                        className="text-xs text-primary hover:underline"
                      >
                        Go to page
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => { markAsRead(n.id); refresh() }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => { deleteNotification(n.id); refresh() }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
