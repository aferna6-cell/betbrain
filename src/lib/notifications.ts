/**
 * Notification Center — in-app activity feed stored in localStorage.
 *
 * Aggregates events from picks (resolved), alerts (triggered), signals (detected).
 * Notifications are ephemeral — stored locally, not in Supabase.
 */

export type NotificationType =
  | 'pick_resolved'
  | 'alert_triggered'
  | 'signal_detected'
  | 'streak_badge'
  | 'ev_opportunity'
  | 'steam_move'
  | 'regression_warning'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link?: string // dashboard link to navigate to
  read: boolean
  data?: Record<string, unknown> // arbitrary payload
  createdAt: string
}

const STORAGE_KEY = 'betbrain_notifications'
const MAX_NOTIFICATIONS = 100

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadNotifications(): Notification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Notification[]) : []
  } catch {
    return []
  }
}

function saveNotifications(notifications: Notification[]): void {
  if (typeof window === 'undefined') return
  // Keep only most recent N
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAllNotifications(): Notification[] {
  return loadNotifications().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getUnreadCount(): number {
  return loadNotifications().filter((n) => !n.read).length
}

export function addNotification(
  input: Omit<Notification, 'id' | 'read' | 'createdAt'>
): Notification {
  const notifications = loadNotifications()

  // Deduplicate: skip if same type + title within last 5 minutes
  const fiveMinAgo = Date.now() - 5 * 60 * 1000
  const isDuplicate = notifications.some(
    (n) =>
      n.type === input.type &&
      n.title === input.title &&
      new Date(n.createdAt).getTime() > fiveMinAgo
  )
  if (isDuplicate) {
    return notifications.find(
      (n) => n.type === input.type && n.title === input.title
    )!
  }

  const notification: Notification = {
    ...input,
    id: crypto.randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
  }

  notifications.unshift(notification)
  saveNotifications(notifications)
  return notification
}

export function markAsRead(id: string): void {
  const notifications = loadNotifications()
  const n = notifications.find((n) => n.id === id)
  if (n) {
    n.read = true
    saveNotifications(notifications)
  }
}

export function markAllAsRead(): void {
  const notifications = loadNotifications()
  for (const n of notifications) {
    n.read = true
  }
  saveNotifications(notifications)
}

export function deleteNotification(id: string): void {
  const notifications = loadNotifications().filter((n) => n.id !== id)
  saveNotifications(notifications)
}

export function clearAllNotifications(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
}

// ---------------------------------------------------------------------------
// Notification generators
// ---------------------------------------------------------------------------

export function notifyPickResolved(
  team: string,
  outcome: 'win' | 'loss' | 'push',
  profit: number
): Notification {
  const emoji = outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'P'
  return addNotification({
    type: 'pick_resolved',
    title: `Pick Resolved: ${team} [${emoji}]`,
    message:
      outcome === 'win'
        ? `Your ${team} pick won! +${profit.toFixed(2)}u profit.`
        : outcome === 'loss'
          ? `Your ${team} pick lost. ${profit.toFixed(2)}u.`
          : `Your ${team} pick pushed. No gain or loss.`,
    link: '/dashboard/picks',
  })
}

export function notifyAlertTriggered(
  team: string,
  market: string,
  value: number
): Notification {
  return addNotification({
    type: 'alert_triggered',
    title: `Alert: ${team} ${market}`,
    message: `Line moved to ${value > 0 ? '+' : ''}${value}. Check odds now.`,
    link: '/dashboard/alerts',
  })
}

export function notifySignalDetected(
  homeTeam: string,
  awayTeam: string,
  strength: string,
  signalCount: number
): Notification {
  return addNotification({
    type: 'signal_detected',
    title: `${strength === 'strong' ? 'Strong' : ''} Signal: ${awayTeam} @ ${homeTeam}`,
    message: `${signalCount} signals align for this matchup.`,
    link: '/dashboard/signals',
  })
}

export function notifyEVOpportunity(
  team: string,
  ev: number,
  book: string
): Notification {
  return addNotification({
    type: 'ev_opportunity',
    title: `+EV: ${team}`,
    message: `${ev.toFixed(1)}% edge found at ${book.replace(/_/g, ' ')}.`,
    link: '/dashboard/ev',
  })
}

export function notifySteamMove(
  team: string,
  direction: string,
  magnitude: number
): Notification {
  return addNotification({
    type: 'steam_move',
    title: `Steam Move: ${team}`,
    message: `${direction} ${magnitude} pts across multiple books.`,
    link: '/dashboard/signals',
  })
}

export function notifyRegressionWarning(
  type: 'roi_drop' | 'losing_streak',
  detail: string
): Notification {
  return addNotification({
    type: 'regression_warning',
    title: type === 'roi_drop' ? 'ROI Alert' : 'Losing Streak Alert',
    message: detail,
    link: '/dashboard/picks',
  })
}

// ---------------------------------------------------------------------------
// Type metadata
// ---------------------------------------------------------------------------

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  pick_resolved: '🎯',
  alert_triggered: '🔔',
  signal_detected: '📡',
  streak_badge: '🏆',
  ev_opportunity: '💰',
  steam_move: '🔥',
  regression_warning: '⚠️',
}

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  pick_resolved: 'border-blue-500/20',
  alert_triggered: 'border-yellow-500/20',
  signal_detected: 'border-green-500/20',
  streak_badge: 'border-purple-500/20',
  ev_opportunity: 'border-emerald-500/20',
  steam_move: 'border-orange-500/20',
  regression_warning: 'border-red-500/20',
}
