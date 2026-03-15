/**
 * Backtesting engine unit tests.
 *
 * Validates determinism, strategy behavior, game counts, summary math,
 * config effects, disclaimer presence, and edge-case invariants.
 * Pure logic only — no external API or database calls.
 */

import { describe, it, expect } from 'vitest'
import { runBacktest } from '@/lib/backtesting'
import type { BacktestConfig } from '@/lib/backtesting'

// Base config reused across groups
const BASE_CONFIG: BacktestConfig = {
  sport: 'nba',
  season: '2024-25',
  strategy: 'smart-signals',
  unitSize: 100,
  startingBankroll: 1000,
}

// ---------------------------------------------------------------------------
// 1. Determinism
// ---------------------------------------------------------------------------

describe('runBacktest determinism', () => {
  it('produces identical results for the same config', () => {
    const r1 = runBacktest(BASE_CONFIG)
    const r2 = runBacktest(BASE_CONFIG)
    expect(r1.summary).toEqual(r2.summary)
    expect(r1.games).toEqual(r2.games)
  })

  it('produces identical game arrays for the same config', () => {
    const r1 = runBacktest(BASE_CONFIG)
    const r2 = runBacktest(BASE_CONFIG)
    expect(r1.games.length).toBe(r2.games.length)
    for (let i = 0; i < r1.games.length; i++) {
      expect(r1.games[i]).toEqual(r2.games[i])
    }
  })

  it('different sport changes totalProfit', () => {
    const nba = runBacktest(BASE_CONFIG)
    const nfl = runBacktest({ ...BASE_CONFIG, sport: 'nfl' })
    expect(nfl.summary.totalProfit).not.toBe(nba.summary.totalProfit)
  })

  it('different season changes totalProfit', () => {
    const r1 = runBacktest(BASE_CONFIG)
    const r2 = runBacktest({ ...BASE_CONFIG, season: '2022-23' })
    expect(r2.summary.totalProfit).not.toBe(r1.summary.totalProfit)
  })

  it('different strategy changes totalGames', () => {
    const ss = runBacktest(BASE_CONFIG)
    const hc = runBacktest({ ...BASE_CONFIG, strategy: 'high-confidence' })
    expect(hc.summary.totalGames).not.toBe(ss.summary.totalGames)
  })

  it('changing unitSize changes totalProfit magnitude', () => {
    const r100 = runBacktest(BASE_CONFIG)
    const r200 = runBacktest({ ...BASE_CONFIG, unitSize: 200 })
    // Doubling the unit size should double the profit
    expect(Math.abs(r200.summary.totalProfit)).toBeGreaterThan(Math.abs(r100.summary.totalProfit))
  })

  it('changing startingBankroll alone does not change totalProfit', () => {
    const r1000 = runBacktest(BASE_CONFIG)
    const r5000 = runBacktest({ ...BASE_CONFIG, startingBankroll: 5000 })
    expect(r5000.summary.totalProfit).toBe(r1000.summary.totalProfit)
  })
})

// ---------------------------------------------------------------------------
// 2. Strategy behavior
// ---------------------------------------------------------------------------

describe('Strategy behavior', () => {
  it('smart-signals win rate is between 54% and 60%', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.winRate).toBeGreaterThanOrEqual(54)
    expect(r.summary.winRate).toBeLessThanOrEqual(60)
  })

  it('high-confidence has fewer games than smart-signals', () => {
    const ss = runBacktest(BASE_CONFIG)
    const hc = runBacktest({ ...BASE_CONFIG, strategy: 'high-confidence' })
    expect(hc.summary.totalGames).toBeLessThan(ss.summary.totalGames)
  })

  it('high-confidence is around 40% of season game count', () => {
    // NBA season = 82 games, 40% = ~33. Allow ±20 for seeded variance.
    const hcResult = runBacktest({ ...BASE_CONFIG, strategy: 'high-confidence' })
    expect(hcResult.summary.totalGames).toBeGreaterThan(20)
    expect(hcResult.summary.totalGames).toBeLessThan(55)
  })

  it('value-plays has more games than high-confidence', () => {
    const hc = runBacktest({ ...BASE_CONFIG, strategy: 'high-confidence' })
    const vp = runBacktest({ ...BASE_CONFIG, strategy: 'value-plays' })
    expect(vp.summary.totalGames).toBeGreaterThan(hc.summary.totalGames)
  })

  it('value-plays has fewer games than smart-signals', () => {
    const ss = runBacktest(BASE_CONFIG)
    const vp = runBacktest({ ...BASE_CONFIG, strategy: 'value-plays' })
    expect(vp.summary.totalGames).toBeLessThan(ss.summary.totalGames)
  })

  it('strategy ordering: smart-signals >= value-plays >= high-confidence', () => {
    const ss = runBacktest(BASE_CONFIG)
    const vp = runBacktest({ ...BASE_CONFIG, strategy: 'value-plays' })
    const hc = runBacktest({ ...BASE_CONFIG, strategy: 'high-confidence' })
    expect(ss.summary.totalGames).toBeGreaterThanOrEqual(vp.summary.totalGames)
    expect(vp.summary.totalGames).toBeGreaterThanOrEqual(hc.summary.totalGames)
  })
})

// ---------------------------------------------------------------------------
// 3. Game counts per sport (smart-signals uses gamesFraction: 1.0)
// ---------------------------------------------------------------------------

describe('Game counts per sport', () => {
  it('NBA produces 82 games for smart-signals', () => {
    const r = runBacktest({ ...BASE_CONFIG, sport: 'nba' })
    expect(r.summary.totalGames).toBe(82)
  })

  it('NFL produces 17 games for smart-signals', () => {
    const r = runBacktest({ ...BASE_CONFIG, sport: 'nfl' })
    expect(r.summary.totalGames).toBe(17)
  })

  it('MLB produces 162 games for smart-signals', () => {
    const r = runBacktest({ ...BASE_CONFIG, sport: 'mlb' })
    expect(r.summary.totalGames).toBe(162)
  })

  it('NHL produces 82 games for smart-signals', () => {
    const r = runBacktest({ ...BASE_CONFIG, sport: 'nhl' })
    expect(r.summary.totalGames).toBe(82)
  })

  it('returned games array length matches summary.totalGames', () => {
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl'] as const) {
      const r = runBacktest({ ...BASE_CONFIG, sport })
      expect(r.games.length).toBe(r.summary.totalGames)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Summary calculations
// ---------------------------------------------------------------------------

describe('Summary calculations', () => {
  it('wins + losses + pushes equals totalGames', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.wins + r.summary.losses + r.summary.pushes).toBe(r.summary.totalGames)
  })

  it('wins + losses + pushes equals totalGames across all strategies', () => {
    for (const strategy of ['smart-signals', 'high-confidence', 'value-plays'] as const) {
      const r = runBacktest({ ...BASE_CONFIG, strategy })
      expect(r.summary.wins + r.summary.losses + r.summary.pushes).toBe(
        r.summary.totalGames,
      )
    }
  })

  it('winRate equals wins divided by (wins + losses) as a percentage', () => {
    const r = runBacktest(BASE_CONFIG)
    const expectedWinRate = Math.round((r.summary.wins / (r.summary.wins + r.summary.losses)) * 1000) / 10
    expect(r.summary.winRate).toBe(expectedWinRate)
  })

  it('roi equals totalProfit / totalWagered * 100', () => {
    const r = runBacktest(BASE_CONFIG)
    const expectedRoi = Math.round((r.summary.totalProfit / r.summary.totalWagered) * 10000) / 100
    expect(r.summary.roi).toBe(expectedRoi)
  })

  it('finalBankroll equals startingBankroll plus totalProfit', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.finalBankroll).toBeCloseTo(r.config.startingBankroll + r.summary.totalProfit, 1)
  })

  it('finalBankroll equals startingBankroll plus totalProfit for non-default bankroll', () => {
    const r = runBacktest({ ...BASE_CONFIG, startingBankroll: 5000 })
    expect(r.summary.finalBankroll).toBeCloseTo(5000 + r.summary.totalProfit, 1)
  })

  it('totalWagered equals unitSize * totalGames', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.totalWagered).toBe(BASE_CONFIG.unitSize * r.summary.totalGames)
  })

  it('last game runningBankroll matches summary finalBankroll', () => {
    const r = runBacktest(BASE_CONFIG)
    const lastGame = r.games[r.games.length - 1]
    expect(lastGame.runningBankroll).toBe(r.summary.finalBankroll)
  })
})

// ---------------------------------------------------------------------------
// 5. Config validation — unit size, bankroll, season
// ---------------------------------------------------------------------------

describe('Config validation', () => {
  it('larger unitSize produces proportionally larger profit magnitude', () => {
    const r100 = runBacktest(BASE_CONFIG)
    const r200 = runBacktest({ ...BASE_CONFIG, unitSize: 200 })
    // The profit should approximately double (same win/loss pattern, double stake)
    expect(r200.summary.totalProfit).toBeCloseTo(r100.summary.totalProfit * 2, 0)
  })

  it('larger unitSize increases totalWagered proportionally', () => {
    const r100 = runBacktest(BASE_CONFIG)
    const r200 = runBacktest({ ...BASE_CONFIG, unitSize: 200 })
    expect(r200.summary.totalWagered).toBe(r100.summary.totalWagered * 2)
  })

  it('larger startingBankroll shifts finalBankroll by the same delta', () => {
    const r1000 = runBacktest(BASE_CONFIG)
    const r5000 = runBacktest({ ...BASE_CONFIG, startingBankroll: 5000 })
    const delta = 5000 - 1000
    expect(r5000.summary.finalBankroll - r1000.summary.finalBankroll).toBeCloseTo(delta, 1)
  })

  it('different seasons produce different results for the same sport', () => {
    const r2024 = runBacktest(BASE_CONFIG)
    const r2023 = runBacktest({ ...BASE_CONFIG, season: '2023-24' })
    const r2022 = runBacktest({ ...BASE_CONFIG, season: '2022-23' })
    const profits = [r2024.summary.totalProfit, r2023.summary.totalProfit, r2022.summary.totalProfit]
    const unique = new Set(profits)
    expect(unique.size).toBe(3)
  })

  it('config is stored verbatim on the result', () => {
    const cfg: BacktestConfig = { ...BASE_CONFIG, season: '2021-22', unitSize: 50 }
    const r = runBacktest(cfg)
    expect(r.config).toEqual(cfg)
  })
})

// ---------------------------------------------------------------------------
// 6. Disclaimer
// ---------------------------------------------------------------------------

describe('Disclaimer', () => {
  it('result always includes a disclaimer string', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(typeof r.disclaimer).toBe('string')
    expect(r.disclaimer.length).toBeGreaterThan(0)
  })

  it('disclaimer contains "informational purposes"', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.disclaimer.toLowerCase()).toContain('informational purposes')
  })

  it('disclaimer is present for every sport and strategy combination', () => {
    const sports = ['nba', 'nfl', 'mlb', 'nhl'] as const
    const strategies = ['smart-signals', 'high-confidence', 'value-plays'] as const
    for (const sport of sports) {
      for (const strategy of strategies) {
        const r = runBacktest({ ...BASE_CONFIG, sport, strategy })
        expect(r.disclaimer.toLowerCase()).toContain('informational purposes')
      }
    }
  })

  it('disclaimer warns about simulated performance', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.disclaimer.toLowerCase()).toContain('past simulated performance')
  })
})

// ---------------------------------------------------------------------------
// 7. Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('all games have valid ISO date strings (YYYY-MM-DD)', () => {
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl'] as const) {
      const r = runBacktest({ ...BASE_CONFIG, sport })
      for (const game of r.games) {
        expect(game.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })

  it('all odds are valid American odds — never zero', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      expect(game.odds).not.toBe(0)
    }
  })

  it('all odds are within the expected moneyline range', () => {
    const validOdds = new Set([-140, -130, -120, -115, -110, -105, -100, 105, 110, 115, 120, 130])
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      expect(validOdds.has(game.odds)).toBe(true)
    }
  })

  it('running bankroll is monotonically tracked — each game reflects prev + profit', () => {
    const r = runBacktest(BASE_CONFIG)
    let prev = BASE_CONFIG.startingBankroll
    for (const game of r.games) {
      const expected = Math.round((prev + game.profit) * 100) / 100
      // Allow up to 0.02 for floating-point intermediate rounding
      expect(Math.abs(game.runningBankroll - expected)).toBeLessThanOrEqual(0.02)
      prev = game.runningBankroll
    }
  })

  it('maxDrawdown is non-negative', () => {
    for (const strategy of ['smart-signals', 'high-confidence', 'value-plays'] as const) {
      const r = runBacktest({ ...BASE_CONFIG, strategy })
      expect(r.summary.maxDrawdown).toBeGreaterThanOrEqual(0)
    }
  })

  it('peakBankroll is greater than or equal to startingBankroll', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.peakBankroll).toBeGreaterThanOrEqual(BASE_CONFIG.startingBankroll)
  })

  it('peakBankroll is greater than or equal to finalBankroll', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.peakBankroll).toBeGreaterThanOrEqual(r.summary.finalBankroll)
  })

  it('bestStreak is non-negative', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.bestStreak).toBeGreaterThanOrEqual(0)
  })

  it('worstStreak is non-negative', () => {
    const r = runBacktest(BASE_CONFIG)
    expect(r.summary.worstStreak).toBeGreaterThanOrEqual(0)
  })

  it('every game has at least one signal', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      expect(game.signals.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('every game confidence is between 60 and 92 inclusive', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      expect(game.confidence).toBeGreaterThanOrEqual(60)
      expect(game.confidence).toBeLessThanOrEqual(92)
    }
  })

  it('every game result is win, loss, or push', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      expect(['win', 'loss', 'push']).toContain(game.result)
    }
  })

  it('push games have zero profit', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      if (game.result === 'push') {
        expect(game.profit).toBe(0)
      }
    }
  })

  it('loss games have negative profit equal to -unitSize', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      if (game.result === 'loss') {
        expect(game.profit).toBe(-BASE_CONFIG.unitSize)
      }
    }
  })

  it('win games have positive profit', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      if (game.result === 'win') {
        expect(game.profit).toBeGreaterThan(0)
      }
    }
  })

  it('every game has distinct home and away teams', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      expect(game.homeTeam).not.toBe(game.awayTeam)
    }
  })

  it('every game side is home or away', () => {
    const r = runBacktest(BASE_CONFIG)
    for (const game of r.games) {
      expect(['home', 'away']).toContain(game.side)
    }
  })
})
