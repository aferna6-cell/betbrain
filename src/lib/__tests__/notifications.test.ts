import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
  length: 0,
  key: vi.fn(() => null),
}

vi.stubGlobal('window', { localStorage: localStorageMock })
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('crypto', { randomUUID: () => `test-${Date.now()}-${Math.random()}` })

import {
  getAllNotifications,
  getUnreadCount,
  addNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  notifyPickResolved,
  notifyAlertTriggered,
  notifySignalDetected,
  notifyEVOpportunity,
  notifyRegressionWarning,
} from '../notifications'

describe('notifications', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('adds and retrieves notifications', () => {
    addNotification({
      type: 'pick_resolved',
      title: 'Pick Won',
      message: 'Lakers won!',
    })

    const all = getAllNotifications()
    expect(all.length).toBe(1)
    expect(all[0].title).toBe('Pick Won')
    expect(all[0].read).toBe(false)
  })

  it('tracks unread count', () => {
    addNotification({ type: 'pick_resolved', title: 'A', message: 'M' })
    addNotification({ type: 'alert_triggered', title: 'B', message: 'M' })

    expect(getUnreadCount()).toBe(2)
  })

  it('marks single notification as read', () => {
    const n = addNotification({ type: 'pick_resolved', title: 'A', message: 'M' })
    markAsRead(n.id)

    expect(getUnreadCount()).toBe(0)
    expect(getAllNotifications()[0].read).toBe(true)
  })

  it('marks all as read', () => {
    addNotification({ type: 'pick_resolved', title: 'A', message: 'M' })
    addNotification({ type: 'alert_triggered', title: 'B', message: 'M' })
    markAllAsRead()

    expect(getUnreadCount()).toBe(0)
  })

  it('deletes a notification', () => {
    const n = addNotification({ type: 'pick_resolved', title: 'Delete me', message: 'M' })
    deleteNotification(n.id)

    expect(getAllNotifications().length).toBe(0)
  })

  it('clears all notifications', () => {
    addNotification({ type: 'pick_resolved', title: 'A', message: 'M' })
    addNotification({ type: 'alert_triggered', title: 'B', message: 'M' })
    clearAllNotifications()

    expect(getAllNotifications().length).toBe(0)
  })

  it('deduplicates same type+title within 5 minutes', () => {
    addNotification({ type: 'pick_resolved', title: 'Same', message: 'M' })
    addNotification({ type: 'pick_resolved', title: 'Same', message: 'M' })

    expect(getAllNotifications().length).toBe(1)
  })

  it('allows same title with different type', () => {
    addNotification({ type: 'pick_resolved', title: 'Same', message: 'M' })
    addNotification({ type: 'alert_triggered', title: 'Same', message: 'M' })

    expect(getAllNotifications().length).toBe(2)
  })

  it('sorts newest first', () => {
    const n1 = addNotification({ type: 'pick_resolved', title: 'First', message: 'M' })
    // Manually adjust createdAt to be older
    const all = getAllNotifications()
    const stored = JSON.parse(localStorageMock.getItem('betbrain_notifications')!)
    stored[0].createdAt = '2020-01-01T00:00:00Z'
    localStorageMock.setItem('betbrain_notifications', JSON.stringify(stored))

    addNotification({ type: 'alert_triggered', title: 'Second', message: 'M' })

    const sorted = getAllNotifications()
    expect(sorted[0].title).toBe('Second')
  })

  describe('notification generators', () => {
    it('notifyPickResolved creates win notification', () => {
      const n = notifyPickResolved('Lakers', 'win', 1.5)
      expect(n.type).toBe('pick_resolved')
      expect(n.title).toContain('Lakers')
      expect(n.title).toContain('[W]')
      expect(n.message).toContain('+1.50u')
    })

    it('notifyPickResolved creates loss notification', () => {
      const n = notifyPickResolved('Celtics', 'loss', -1.0)
      expect(n.title).toContain('[L]')
      expect(n.message).toContain('-1.00u')
    })

    it('notifyAlertTriggered creates alert', () => {
      const n = notifyAlertTriggered('Lakers', 'moneyline', -150)
      expect(n.type).toBe('alert_triggered')
      expect(n.title).toContain('Lakers')
    })

    it('notifySignalDetected creates signal', () => {
      const n = notifySignalDetected('Lakers', 'Celtics', 'strong', 3)
      expect(n.type).toBe('signal_detected')
      expect(n.message).toContain('3 signals')
    })

    it('notifyEVOpportunity creates +EV alert', () => {
      const n = notifyEVOpportunity('Lakers', 5.2, 'draftkings')
      expect(n.type).toBe('ev_opportunity')
      expect(n.message).toContain('5.2%')
    })

    it('notifyRegressionWarning creates warning', () => {
      const n = notifyRegressionWarning('roi_drop', 'ROI at -15%')
      expect(n.type).toBe('regression_warning')
      expect(n.title).toContain('ROI Alert')
    })
  })
})
