import { describe, it, expect } from 'vitest'
import {
  detectRegressions,
  DEFAULT_CONFIG,
  type RegressionConfig,
} from '../regression-alerts'

interface TestPick {
  outcome: string | null
  profit: number | null
  units: number
  sport: string
  created_at: string
}

function makePick(
  outcome: string,
  profit: number,
  opts: Partial<TestPick> = {}
): TestPick {
  return {
    outcome,
    profit,
    units: 1,
    sport: 'nba',
    created_at: new Date().toISOString(),
    ...opts,
  }
}

function makePickSequence(
  outcomes: Array<{ outcome: string; profit: number }>,
  sport = 'nba'
): TestPick[] {
  return outcomes.map((o, i) => ({
    outcome: o.outcome,
    profit: o.profit,
    units: 1,
    sport,
    created_at: new Date(Date.now() - i * 3600000).toISOString(), // each pick 1hr apart
  }))
}

describe('regression-alerts', () => {
  describe('detectRegressions', () => {
    it('returns empty for no picks', () => {
      expect(detectRegressions([])).toEqual([])
    })

    it('returns empty for all wins', () => {
      const picks = makePickSequence(
        Array(10).fill({ outcome: 'win', profit: 1 })
      )
      expect(detectRegressions(picks)).toEqual([])
    })

    it('detects losing streak', () => {
      const picks = makePickSequence([
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'win', profit: 1 },
      ])
      const alerts = detectRegressions(picks)
      const streakAlert = alerts.find((a) => a.type === 'losing_streak')
      expect(streakAlert).toBeDefined()
      expect(streakAlert!.message).toContain('5')
    })

    it('does not alert for short losing streak', () => {
      const picks = makePickSequence([
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'win', profit: 1 },
      ])
      const alerts = detectRegressions(picks)
      expect(alerts.find((a) => a.type === 'losing_streak')).toBeUndefined()
    })

    it('detects ROI drop', () => {
      const picks = makePickSequence([
        ...Array(3).fill({ outcome: 'win', profit: 0.5 }),
        ...Array(7).fill({ outcome: 'loss', profit: -2 }),
      ])
      const alerts = detectRegressions(picks, { ...DEFAULT_CONFIG, roiWindow: 10 })
      const roiAlert = alerts.find((a) => a.type === 'roi_drop')
      expect(roiAlert).toBeDefined()
    })

    it('does not alert when ROI is positive', () => {
      const picks = makePickSequence(
        Array(10).fill({ outcome: 'win', profit: 1 })
      )
      const alerts = detectRegressions(picks, { ...DEFAULT_CONFIG, roiWindow: 10 })
      expect(alerts.find((a) => a.type === 'roi_drop')).toBeUndefined()
    })

    it('detects cold sport', () => {
      const picks = makePickSequence(
        [
          ...Array(4).fill({ outcome: 'loss', profit: -1 }),
          { outcome: 'win', profit: 0.5 },
          ...Array(3).fill({ outcome: 'loss', profit: -1 }),
          { outcome: 'win', profit: 0.5 },
          { outcome: 'loss', profit: -1 },
        ],
        'nfl'
      )
      const alerts = detectRegressions(picks, { ...DEFAULT_CONFIG, sportWindow: 10 })
      const cold = alerts.find((a) => a.type === 'cold_sport')
      expect(cold).toBeDefined()
      expect(cold!.title).toContain('NFL')
    })

    it('detects unit drain', () => {
      const picks = makePickSequence(
        Array(10).fill({ outcome: 'loss', profit: -1 })
      )
      const alerts = detectRegressions(picks, {
        ...DEFAULT_CONFIG,
        unitDrainThreshold: -8,
        unitDrainWindow: 10,
      })
      const drain = alerts.find((a) => a.type === 'unit_drain')
      expect(drain).toBeDefined()
    })

    it('ignores pending picks', () => {
      const picks: TestPick[] = [
        makePick('pending', 0),
        makePick('pending', 0),
        makePick('win', 1),
      ]
      const alerts = detectRegressions(picks)
      expect(alerts).toEqual([])
    })

    it('marks critical severity for extreme cases', () => {
      const picks = makePickSequence(
        Array(10).fill({ outcome: 'loss', profit: -1 })
      )
      const alerts = detectRegressions(picks, {
        ...DEFAULT_CONFIG,
        losingStreakThreshold: 5,
      })
      const streak = alerts.find((a) => a.type === 'losing_streak')
      expect(streak?.severity).toBe('critical')
    })

    it('respects custom config thresholds', () => {
      const picks = makePickSequence([
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'loss', profit: -1 },
        { outcome: 'win', profit: 1 },
      ])
      const customConfig: RegressionConfig = {
        ...DEFAULT_CONFIG,
        losingStreakThreshold: 3,
      }
      const alerts = detectRegressions(picks, customConfig)
      expect(alerts.find((a) => a.type === 'losing_streak')).toBeDefined()
    })

    it('needs at least 5 resolved picks for ROI alert', () => {
      const picks = makePickSequence([
        { outcome: 'loss', profit: -5 },
        { outcome: 'loss', profit: -5 },
        { outcome: 'loss', profit: -5 },
      ])
      const alerts = detectRegressions(picks, { ...DEFAULT_CONFIG, roiWindow: 3 })
      expect(alerts.find((a) => a.type === 'roi_drop')).toBeUndefined()
    })
  })
})
