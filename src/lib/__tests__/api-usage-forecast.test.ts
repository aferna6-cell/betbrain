import { describe, it, expect } from 'vitest'
import {
  calculateUsageForecast,
  getStatusColor,
  getStatusBg,
} from '../api-usage-forecast'

describe('calculateUsageForecast', () => {
  const midMonth = new Date(2026, 2, 15) // March 15, 2026

  it('calculates basic forecast', () => {
    const result = calculateUsageForecast(250, 500, midMonth)
    expect(result.usedRequests).toBe(250)
    expect(result.monthlyBudget).toBe(500)
    expect(result.remainingRequests).toBe(250)
    expect(result.usedPercentage).toBe(50)
    expect(result.daysElapsed).toBe(15)
    expect(result.daysRemaining).toBe(16)
  })

  it('returns safe status when usage is low', () => {
    const result = calculateUsageForecast(100, 500, midMonth)
    expect(result.status).toBe('safe')
    expect(result.willExhaust).toBe(false)
  })

  it('returns warning status when usage is moderate', () => {
    const result = calculateUsageForecast(350, 500, midMonth)
    expect(result.status).toBe('warning')
  })

  it('returns danger status when usage is high', () => {
    const result = calculateUsageForecast(450, 500, midMonth)
    expect(result.status).toBe('danger')
  })

  it('returns exhausted status when budget is used up', () => {
    const result = calculateUsageForecast(500, 500, midMonth)
    expect(result.status).toBe('exhausted')
    expect(result.remainingRequests).toBe(0)
    expect(result.willExhaust).toBe(true)
    expect(result.daysUntilExhaustion).toBe(0)
  })

  it('projects month-end usage correctly', () => {
    // 100 used in 10 days = 10/day, 21 days remaining
    const day10 = new Date(2026, 2, 10)
    const result = calculateUsageForecast(100, 500, day10)
    // daily burn = 100/10 = 10, projected = 100 + 10*21 = 310
    expect(result.projectedMonthEnd).toBe(310)
    expect(result.willExhaust).toBe(false)
  })

  it('detects exhaustion when burn rate is too high', () => {
    // 400 used in 10 days = 40/day, needs 100 more, 21 days remaining
    // Will exhaust in 100/40 = 2.5 days
    const day10 = new Date(2026, 2, 10)
    const result = calculateUsageForecast(400, 500, day10)
    expect(result.willExhaust).toBe(true)
    expect(result.daysUntilExhaustion).toBe(3)
    expect(result.exhaustionDate).not.toBeNull()
  })

  it('calculates recommended daily budget', () => {
    // 250 remaining, 16 days left
    const result = calculateUsageForecast(250, 500, midMonth)
    expect(result.recommendedDailyBudget).toBe(Math.floor(250 / 16))
  })

  it('uses weighted history when available', () => {
    const history = [
      { date: '2026-03-13', requests: 10 },
      { date: '2026-03-14', requests: 20 },
      { date: '2026-03-15', requests: 30 },
    ]
    const result = calculateUsageForecast(200, 500, midMonth, history)
    // Weighted: (10*1 + 20*2 + 30*3) / (1+2+3) = (10+40+90)/6 = 23.33
    expect(result.dailyBurnRate).toBeCloseTo(23.33, 1)
  })

  it('handles first day of month', () => {
    const firstDay = new Date(2026, 2, 1)
    const result = calculateUsageForecast(5, 500, firstDay)
    expect(result.daysElapsed).toBe(1)
    expect(result.daysRemaining).toBe(30)
    expect(result.status).toBe('safe')
  })

  it('handles last day of month', () => {
    const lastDay = new Date(2026, 2, 31)
    const result = calculateUsageForecast(490, 500, lastDay)
    expect(result.daysRemaining).toBe(0)
    expect(result.recommendedDailyBudget).toBe(0)
  })

  it('generates suggestions for each status', () => {
    const safe = calculateUsageForecast(100, 500, midMonth)
    expect(safe.suggestions.length).toBeGreaterThan(0)
    expect(safe.suggestions[0]).toContain('healthy')

    const exhausted = calculateUsageForecast(500, 500, midMonth)
    expect(exhausted.suggestions[0]).toContain('exhausted')
  })

  it('clamps remaining to zero', () => {
    const result = calculateUsageForecast(600, 500, midMonth)
    expect(result.remainingRequests).toBe(0)
  })
})

describe('getStatusColor', () => {
  it('returns green for safe', () => {
    expect(getStatusColor('safe')).toContain('green')
  })

  it('returns amber for warning', () => {
    expect(getStatusColor('warning')).toContain('amber')
  })

  it('returns red for danger', () => {
    expect(getStatusColor('danger')).toContain('red')
  })

  it('returns red for exhausted', () => {
    expect(getStatusColor('exhausted')).toContain('red')
  })
})

describe('getStatusBg', () => {
  it('returns border and bg for each status', () => {
    expect(getStatusBg('safe')).toContain('green')
    expect(getStatusBg('warning')).toContain('amber')
    expect(getStatusBg('danger')).toContain('red')
    expect(getStatusBg('exhausted')).toContain('red')
  })
})
