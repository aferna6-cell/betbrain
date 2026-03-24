import { describe, it, expect } from 'vitest'
import {
  checkMilestones,
  generateMilestoneAlerts,
  type BankrollSnapshot,
} from '../bankroll-milestones'

describe('checkMilestones', () => {
  it('returns empty result for no snapshots', () => {
    const result = checkMilestones([], 1000)
    expect(result.milestones.length).toBe(0)
    expect(result.currentBankroll).toBe(1000)
  })

  it('detects 10% growth milestone', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1100 },
    ]
    const result = checkMilestones(snapshots, 1000)
    const growth10 = result.milestones.find((m) => m.label === '10% Growth')
    expect(growth10?.reached).toBe(true)
  })

  it('does not mark unreached milestones', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1050 },
    ]
    const result = checkMilestones(snapshots, 1000)
    const growth10 = result.milestones.find((m) => m.label === '10% Growth')
    expect(growth10?.reached).toBe(false)
    expect(growth10?.progress).toBeGreaterThan(0)
    expect(growth10?.progress).toBeLessThan(100)
  })

  it('calculates growth percentage', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1500 },
    ]
    const result = checkMilestones(snapshots, 1000)
    expect(result.growthPct).toBe(50)
  })

  it('detects all-time high', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-18', balance: 1200 },
      { date: '2026-03-19', balance: 1100 },
      { date: '2026-03-20', balance: 1300 },
    ]
    const result = checkMilestones(snapshots, 1000)
    expect(result.allTimeHigh).toBe(1300)
    const ath = result.milestones.find((m) => m.type === 'ath')
    expect(ath?.reached).toBe(true)
  })

  it('detects when not at all-time high', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-18', balance: 1300 },
      { date: '2026-03-20', balance: 1100 },
    ]
    const result = checkMilestones(snapshots, 1000)
    expect(result.allTimeHigh).toBe(1300)
    const ath = result.milestones.find((m) => m.type === 'ath')
    expect(ath?.reached).toBe(false)
  })

  it('detects drawdown alerts', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-18', balance: 1500 },
      { date: '2026-03-20', balance: 1100 },
    ]
    const result = checkMilestones(snapshots, 1000)
    // Drawdown from ATH: (1500-1100)/1500 = 26.67%
    const dd25 = result.milestones.find((m) => m.label === '25% Drawdown')
    expect(dd25?.reached).toBe(true)
  })

  it('calculates drawdown from ATH', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-18', balance: 2000 },
      { date: '2026-03-20', balance: 1500 },
    ]
    const result = checkMilestones(snapshots, 1000)
    expect(result.drawdownFromATH).toBe(25)
  })

  it('identifies newly reached milestones', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1150 },
    ]
    const previouslyReached = new Set<string>()
    const result = checkMilestones(snapshots, 1000, previouslyReached)
    expect(result.newlyReached.some((m) => m.label === '10% Growth')).toBe(true)
  })

  it('excludes previously acknowledged milestones', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1150 },
    ]
    const previouslyReached = new Set(['10% Growth'])
    const result = checkMilestones(snapshots, 1000, previouslyReached)
    expect(result.newlyReached.some((m) => m.label === '10% Growth')).toBe(false)
  })

  it('finds next unreached milestone', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1150 },
    ]
    const result = checkMilestones(snapshots, 1000)
    // 10% reached (1100 < 1150), next is 25% (1250)
    expect(result.nextMilestone?.label).toBe('25% Growth')
  })

  it('handles zero starting bankroll', () => {
    const result = checkMilestones([{ date: '2026-03-20', balance: 100 }], 0)
    expect(result.milestones.length).toBe(0)
  })

  it('calculates progress toward next milestone', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1050 }, // 5% of the way to 10% growth (target: 1100)
    ]
    const result = checkMilestones(snapshots, 1000)
    const growth10 = result.milestones.find((m) => m.label === '10% Growth')
    expect(growth10?.progress).toBe(50) // $50 of $100 needed
  })
})

describe('generateMilestoneAlerts', () => {
  it('generates growth alerts', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1500 },
    ]
    const result = checkMilestones(snapshots, 1000)
    const alerts = generateMilestoneAlerts(result)
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts.some((a) => a.type === 'success')).toBe(true)
  })

  it('generates drawdown warnings', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-18', balance: 1500 },
      { date: '2026-03-20', balance: 900 },
    ]
    const result = checkMilestones(snapshots, 1000)
    const alerts = generateMilestoneAlerts(result)
    const warnings = alerts.filter((a) => a.type === 'warning')
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('generates ATH alert', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1200 },
    ]
    const result = checkMilestones(snapshots, 1000)
    const alerts = generateMilestoneAlerts(result)
    const athAlert = alerts.find((a) => a.title.includes('All-Time'))
    expect(athAlert).toBeDefined()
    expect(athAlert?.type).toBe('success')
  })

  it('returns empty for no new milestones', () => {
    const snapshots: BankrollSnapshot[] = [
      { date: '2026-03-20', balance: 1050 },
    ]
    const previouslyReached = new Set(['All-Time High'])
    const result = checkMilestones(snapshots, 1000, previouslyReached)
    const alerts = generateMilestoneAlerts(result)
    expect(alerts.length).toBe(0)
  })
})
