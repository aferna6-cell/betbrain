import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkDailyLoss,
  checkConsecutiveLosses,
  checkDrawdown,
  checkWinRateDrop,
  checkTilt,
  checkAllBankrollAlerts,
  loadConfig,
  saveConfig,
  type BankrollAlertConfig,
} from '../smart-bankroll-alerts'

const store: Record<string, string> = {}
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
  vi.stubGlobal('window', {})
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
  })
})

const defaultConfig: BankrollAlertConfig = {
  maxDailyLossPercent: 5,
  maxConsecutiveLosses: 5,
  drawdownThreshold: 15,
  winRateDropThreshold: 10,
  enabled: true,
}

const today = new Date().toISOString().split('T')[0]

describe('checkDailyLoss', () => {
  it('triggers when daily loss exceeds threshold', () => {
    const picks = [
      { created_at: `${today}T10:00:00Z`, outcome: 'loss', profit: -60, units: 1 },
    ]
    const alert = checkDailyLoss(picks, 1000, defaultConfig)
    expect(alert).toBeTruthy()
    expect(alert!.type).toBe('daily-loss')
    expect(alert!.severity).toBe('warning')
  })

  it('no alert when within limit', () => {
    const picks = [
      { created_at: `${today}T10:00:00Z`, outcome: 'loss', profit: -10, units: 1 },
    ]
    expect(checkDailyLoss(picks, 1000, defaultConfig)).toBeNull()
  })

  it('critical severity at 2x threshold', () => {
    const picks = [
      { created_at: `${today}T10:00:00Z`, outcome: 'loss', profit: -110, units: 1 },
    ]
    const alert = checkDailyLoss(picks, 1000, defaultConfig)
    expect(alert?.severity).toBe('critical')
  })

  it('null for zero bankroll', () => {
    expect(checkDailyLoss([], 0, defaultConfig)).toBeNull()
  })
})

describe('checkConsecutiveLosses', () => {
  it('triggers at threshold', () => {
    const picks = Array.from({ length: 5 }, (_, i) => ({
      created_at: `2026-01-${String(15 - i).padStart(2, '0')}`,
      outcome: 'loss' as const,
      profit: -100,
      units: 1,
    }))
    const alert = checkConsecutiveLosses(picks, defaultConfig)
    expect(alert).toBeTruthy()
    expect(alert!.type).toBe('consecutive-losses')
  })

  it('no alert when streak is broken', () => {
    const picks = [
      { created_at: '2026-01-15', outcome: 'loss', profit: -100, units: 1 },
      { created_at: '2026-01-14', outcome: 'win', profit: 91, units: 1 },
      { created_at: '2026-01-13', outcome: 'loss', profit: -100, units: 1 },
    ]
    expect(checkConsecutiveLosses(picks, defaultConfig)).toBeNull()
  })

  it('counts from most recent backward', () => {
    const picks = [
      { created_at: '2026-01-20', outcome: 'win', profit: 91, units: 1 },
      ...Array.from({ length: 5 }, (_, i) => ({
        created_at: `2026-01-${String(15 - i).padStart(2, '0')}`,
        outcome: 'loss' as const,
        profit: -100,
        units: 1,
      })),
    ]
    // Most recent is a win, so streak = 0
    expect(checkConsecutiveLosses(picks, defaultConfig)).toBeNull()
  })
})

describe('checkDrawdown', () => {
  it('triggers when drawdown exceeds threshold', () => {
    const picks = [
      { created_at: '2026-01-10', outcome: 'win', profit: 200, units: 1 },
      { created_at: '2026-01-11', outcome: 'loss', profit: -400, units: 1 },
    ]
    // Start 1000, peak 1200, current 800, DD = 33.3%
    const alert = checkDrawdown(picks, 1000, defaultConfig)
    expect(alert).toBeTruthy()
    expect(alert!.type).toBe('drawdown')
  })

  it('no alert within threshold', () => {
    const picks = [
      { created_at: '2026-01-10', outcome: 'loss', profit: -50, units: 1 },
    ]
    // Start 1000, peak 1000, current 950, DD = 5%
    expect(checkDrawdown(picks, 1000, defaultConfig)).toBeNull()
  })

  it('null for zero starting bankroll', () => {
    expect(checkDrawdown([], 0, defaultConfig)).toBeNull()
  })
})

describe('checkWinRateDrop', () => {
  it('triggers when recent win rate drops significantly', () => {
    const picks = [
      // First 15: 60% win rate
      ...Array.from({ length: 9 }, (_, i) => ({
        created_at: `2026-01-${String(10 + i).padStart(2, '0')}`,
        outcome: 'win' as const, profit: 91, units: 1,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        created_at: `2026-01-${String(20 + i).padStart(2, '0')}`,
        outcome: 'loss' as const, profit: -100, units: 1,
      })),
      // Last 10: 20% win rate
      ...Array.from({ length: 2 }, (_, i) => ({
        created_at: `2026-02-${String(10 + i).padStart(2, '0')}`,
        outcome: 'win' as const, profit: 91, units: 1,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        created_at: `2026-02-${String(15 + i).padStart(2, '0')}`,
        outcome: 'loss' as const, profit: -100, units: 1,
      })),
    ]
    const alert = checkWinRateDrop(picks, defaultConfig)
    expect(alert).toBeTruthy()
    expect(alert!.type).toBe('win-rate-drop')
  })

  it('no alert for < 20 picks', () => {
    const picks = Array.from({ length: 10 }, (_, i) => ({
      created_at: `2026-01-${10 + i}`,
      outcome: 'loss' as const, profit: -100, units: 1,
    }))
    expect(checkWinRateDrop(picks, defaultConfig)).toBeNull()
  })
})

describe('checkTilt', () => {
  it('detects chase pattern (losses + unit escalation)', () => {
    const picks = [
      { created_at: '2026-01-15', outcome: 'loss', profit: -300, units: 3 },
      { created_at: '2026-01-14', outcome: 'loss', profit: -200, units: 2 },
      { created_at: '2026-01-13', outcome: 'loss', profit: -100, units: 1 },
      { created_at: '2026-01-12', outcome: 'win', profit: 91, units: 1 },
    ]
    const alert = checkTilt(picks)
    expect(alert).toBeTruthy()
    expect(alert!.type).toBe('tilt-warning')
    expect(alert!.severity).toBe('critical')
  })

  it('no tilt when winning', () => {
    const picks = [
      { created_at: '2026-01-15', outcome: 'win', profit: 91, units: 1 },
      { created_at: '2026-01-14', outcome: 'win', profit: 91, units: 1 },
      { created_at: '2026-01-13', outcome: 'win', profit: 91, units: 1 },
      { created_at: '2026-01-12', outcome: 'win', profit: 91, units: 1 },
    ]
    expect(checkTilt(picks)).toBeNull()
  })

  it('no tilt for losses without unit escalation', () => {
    const picks = [
      { created_at: '2026-01-15', outcome: 'loss', profit: -100, units: 1 },
      { created_at: '2026-01-14', outcome: 'loss', profit: -100, units: 1 },
      { created_at: '2026-01-13', outcome: 'loss', profit: -100, units: 1 },
      { created_at: '2026-01-12', outcome: 'loss', profit: -100, units: 1 },
    ]
    expect(checkTilt(picks)).toBeNull()
  })
})

describe('checkAllBankrollAlerts', () => {
  it('runs all checks and returns alerts', () => {
    const picks = [
      ...Array.from({ length: 6 }, (_, i) => ({
        created_at: `${today}T${String(10 + i).padStart(2, '0')}:00:00Z`,
        outcome: 'loss' as const,
        profit: -100,
        units: 1 + i,
      })),
    ]
    const alerts = checkAllBankrollAlerts(picks, 1000, defaultConfig)
    // Should trigger at least daily-loss and consecutive-losses
    expect(alerts.length).toBeGreaterThan(0)
    const types = alerts.map((a) => a.type)
    expect(types).toContain('daily-loss')
  })

  it('returns empty when disabled', () => {
    const alerts = checkAllBankrollAlerts([], 1000, { ...defaultConfig, enabled: false })
    expect(alerts).toEqual([])
  })

  it('saves alerts to localStorage', () => {
    const picks = Array.from({ length: 6 }, (_, i) => ({
      created_at: `${today}T10:0${i}:00Z`,
      outcome: 'loss' as const,
      profit: -100,
      units: 1,
    }))
    checkAllBankrollAlerts(picks, 1000, defaultConfig)
    const saved = store['betbrain_bankroll_alerts']
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved)
    expect(parsed.length).toBeGreaterThan(0)
  })
})

describe('config persistence', () => {
  it('saves and loads config', () => {
    const cfg = { ...defaultConfig, maxDailyLossPercent: 10 }
    saveConfig(cfg)
    const loaded = loadConfig()
    expect(loaded.maxDailyLossPercent).toBe(10)
  })

  it('returns defaults when no config saved', () => {
    const loaded = loadConfig()
    expect(loaded.maxDailyLossPercent).toBe(5)
    expect(loaded.enabled).toBe(true)
  })
})
