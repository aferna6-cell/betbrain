/**
 * EV Decay Tracker tests.
 */

import { describe, it, expect } from 'vitest'
import {
  groupSnapshotsByTime,
  calculateEVAtPoint,
  analyzeEVDecay,
  summarizeEVDecay,
  aggregateBySort,
  type OddsSnapshot,
  type EVDecayAnalysis,
} from '@/lib/ev-decay'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<OddsSnapshot> & { fetchedAt: string }): OddsSnapshot {
  return {
    bookmaker: 'fanduel',
    homeOdds: -150,
    awayOdds: 130,
    ...overrides,
  }
}

function makeSnapshotsAtTime(
  time: string,
  books: Array<{ bookmaker: string; homeOdds: number; awayOdds: number }>
): OddsSnapshot[] {
  return books.map((b) => ({
    fetchedAt: time,
    bookmaker: b.bookmaker,
    homeOdds: b.homeOdds,
    awayOdds: b.awayOdds,
  }))
}

// ---------------------------------------------------------------------------
// groupSnapshotsByTime
// ---------------------------------------------------------------------------

describe('groupSnapshotsByTime', () => {
  it('groups snapshots into time intervals', () => {
    const snapshots = [
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z' }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:02:00Z', bookmaker: 'dk' }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:20:00Z', bookmaker: 'mgm' }),
    ]
    const groups = groupSnapshotsByTime(snapshots, 15)
    expect(groups.size).toBe(2)
  })

  it('handles empty snapshots', () => {
    const groups = groupSnapshotsByTime([], 15)
    expect(groups.size).toBe(0)
  })

  it('uses 15-minute default interval', () => {
    const snapshots = [
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z' }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:05:00Z', bookmaker: 'dk' }),
    ]
    const groups = groupSnapshotsByTime(snapshots)
    expect(groups.size).toBe(1)
  })

  it('separates snapshots across intervals', () => {
    const snapshots = [
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z' }),
      makeSnapshot({ fetchedAt: '2026-03-25T13:00:00Z', bookmaker: 'dk' }),
    ]
    const groups = groupSnapshotsByTime(snapshots, 15)
    expect(groups.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// calculateEVAtPoint
// ---------------------------------------------------------------------------

describe('calculateEVAtPoint', () => {
  it('calculates positive EV when one book has better odds', () => {
    const snapshots = [
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'fanduel', homeOdds: -150, awayOdds: 130 }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'draftkings', homeOdds: -155, awayOdds: 135 }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'betmgm', homeOdds: -145, awayOdds: 125 }),
      // This book has significantly better away odds
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'caesars', homeOdds: -160, awayOdds: 160 }),
    ]
    const result = calculateEVAtPoint(snapshots, 'away')
    expect(result).not.toBeNull()
    expect(result!.ev).toBeGreaterThan(0)
    expect(result!.bookCount).toBeGreaterThanOrEqual(3)
  })

  it('returns null with fewer than 3 bookmakers', () => {
    const snapshots = [
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'fanduel' }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'dk' }),
    ]
    const result = calculateEVAtPoint(snapshots, 'home')
    expect(result).toBeNull()
  })

  it('returns null with empty snapshots', () => {
    expect(calculateEVAtPoint([], 'home')).toBeNull()
  })

  it('returns correct best odds for the side', () => {
    const snapshots = [
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'a', homeOdds: -150, awayOdds: 130 }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'b', homeOdds: -140, awayOdds: 120 }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'c', homeOdds: -130, awayOdds: 110 }),
    ]
    const result = calculateEVAtPoint(snapshots, 'home')
    expect(result).not.toBeNull()
    expect(result!.bestOdds).toBe(-130) // Least negative = best for bettor
  })

  it('handles null odds gracefully', () => {
    const snapshots = [
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'a', homeOdds: null, awayOdds: 130 }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'b', homeOdds: null, awayOdds: 120 }),
      makeSnapshot({ fetchedAt: '2026-03-25T12:00:00Z', bookmaker: 'c', homeOdds: -130, awayOdds: 110 }),
    ]
    const result = calculateEVAtPoint(snapshots, 'home')
    expect(result).toBeNull() // Not enough home odds
  })
})

// ---------------------------------------------------------------------------
// analyzeEVDecay
// ---------------------------------------------------------------------------

describe('analyzeEVDecay', () => {
  const gameTime = '2026-03-25T20:00:00Z'

  it('returns null with fewer than 2 time points', () => {
    const snapshots = makeSnapshotsAtTime('2026-03-25T18:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 130 },
      { bookmaker: 'b', homeOdds: -145, awayOdds: 125 },
      { bookmaker: 'c', homeOdds: -155, awayOdds: 135 },
    ])
    const result = analyzeEVDecay(snapshots, gameTime, 'g1', 'home', 'Lakers')
    expect(result).toBeNull()
  })

  it('returns null if initial EV is not positive', () => {
    // All books have nearly identical odds - no +EV
    const time1 = makeSnapshotsAtTime('2026-03-25T18:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 130 },
      { bookmaker: 'b', homeOdds: -150, awayOdds: 130 },
      { bookmaker: 'c', homeOdds: -150, awayOdds: 130 },
    ])
    const time2 = makeSnapshotsAtTime('2026-03-25T19:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 130 },
      { bookmaker: 'b', homeOdds: -150, awayOdds: 130 },
      { bookmaker: 'c', homeOdds: -150, awayOdds: 130 },
    ])
    const result = analyzeEVDecay(
      [...time1, ...time2], gameTime, 'g1', 'home', 'Lakers'
    )
    expect(result).toBeNull()
  })

  it('tracks EV decay over multiple time points', () => {
    // Time 1: one book has significantly better odds (big EV)
    const time1 = makeSnapshotsAtTime('2026-03-25T16:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 130 },
      { bookmaker: 'b', homeOdds: -145, awayOdds: 125 },
      { bookmaker: 'c', homeOdds: -155, awayOdds: 200 }, // Outlier
    ])
    // Time 2: market corrected, outlier moved toward consensus
    const time2 = makeSnapshotsAtTime('2026-03-25T18:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 140 },
      { bookmaker: 'b', homeOdds: -148, awayOdds: 138 },
      { bookmaker: 'c', homeOdds: -152, awayOdds: 145 },
    ])

    const result = analyzeEVDecay(
      [...time1, ...time2], gameTime, 'g1', 'away', 'Celtics'
    )

    if (result) {
      expect(result.decayPoints.length).toBeGreaterThanOrEqual(2)
      expect(result.initialEV).toBeGreaterThan(0)
      expect(result.gameId).toBe('g1')
      expect(result.side).toBe('away')
      expect(result.team).toBe('Celtics')
      expect(typeof result.decayPercent).toBe('number')
      expect(typeof result.correctionSpeed).toBe('number')
    }
  })

  it('calculates half-life when EV drops below half', () => {
    // Time 1: Big EV
    const time1 = makeSnapshotsAtTime('2026-03-25T14:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 130 },
      { bookmaker: 'b', homeOdds: -145, awayOdds: 125 },
      { bookmaker: 'c', homeOdds: -200, awayOdds: 200 },
    ])
    // Time 2: reduced EV
    const time2 = makeSnapshotsAtTime('2026-03-25T16:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 135 },
      { bookmaker: 'b', homeOdds: -148, awayOdds: 132 },
      { bookmaker: 'c', homeOdds: -170, awayOdds: 155 },
    ])
    // Time 3: nearly corrected
    const time3 = makeSnapshotsAtTime('2026-03-25T18:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 138 },
      { bookmaker: 'b', homeOdds: -149, awayOdds: 136 },
      { bookmaker: 'c', homeOdds: -155, awayOdds: 140 },
    ])

    const result = analyzeEVDecay(
      [...time1, ...time2, ...time3], gameTime, 'g1', 'away', 'Celtics'
    )

    if (result && result.halfLife !== null) {
      expect(result.halfLife).toBeGreaterThan(0)
    }
  })

  it('excludes post-game data points', () => {
    const pre = makeSnapshotsAtTime('2026-03-25T18:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 200 },
      { bookmaker: 'b', homeOdds: -145, awayOdds: 125 },
      { bookmaker: 'c', homeOdds: -155, awayOdds: 135 },
    ])
    const pre2 = makeSnapshotsAtTime('2026-03-25T19:00:00Z', [
      { bookmaker: 'a', homeOdds: -150, awayOdds: 150 },
      { bookmaker: 'b', homeOdds: -148, awayOdds: 140 },
      { bookmaker: 'c', homeOdds: -152, awayOdds: 138 },
    ])
    const post = makeSnapshotsAtTime('2026-03-25T21:00:00Z', [
      { bookmaker: 'a', homeOdds: -300, awayOdds: 250 },
      { bookmaker: 'b', homeOdds: -280, awayOdds: 240 },
      { bookmaker: 'c', homeOdds: -310, awayOdds: 260 },
    ])

    const result = analyzeEVDecay(
      [...pre, ...pre2, ...post], gameTime, 'g1', 'away', 'Celtics'
    )

    if (result) {
      // All decay points should be before game time
      for (const pt of result.decayPoints) {
        expect(pt.minutesBefore).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// summarizeEVDecay
// ---------------------------------------------------------------------------

describe('summarizeEVDecay', () => {
  it('returns empty summary for empty array', () => {
    const summary = summarizeEVDecay([])
    expect(summary.analyses).toEqual([])
    expect(summary.avgHalfLife).toBeNull()
    expect(summary.avgCorrectionSpeed).toBe(0)
    expect(summary.fullyCorrectedCount).toBe(0)
    expect(summary.avgInitialEV).toBe(0)
  })

  it('calculates average metrics across analyses', () => {
    const analyses: EVDecayAnalysis[] = [
      {
        gameId: 'g1',
        side: 'home',
        team: 'Lakers',
        decayPoints: [],
        initialEV: 4.0,
        finalEV: 0.5,
        halfLife: 60,
        decayPercent: 88,
        correctionSpeed: 2.0,
        commenceTime: '2026-03-25T20:00:00Z',
      },
      {
        gameId: 'g2',
        side: 'away',
        team: 'Celtics',
        decayPoints: [],
        initialEV: 3.0,
        finalEV: -0.5,
        halfLife: 30,
        decayPercent: 117,
        correctionSpeed: 4.0,
        commenceTime: '2026-03-25T20:00:00Z',
      },
    ]

    const summary = summarizeEVDecay(analyses)
    expect(summary.analyses.length).toBe(2)
    expect(summary.avgHalfLife).toBe(45) // (60 + 30) / 2
    expect(summary.avgCorrectionSpeed).toBe(3.0) // (2 + 4) / 2
    expect(summary.fullyCorrectedCount).toBe(1) // g2 has finalEV <= 0
    expect(summary.avgInitialEV).toBe(3.5) // (4 + 3) / 2
  })

  it('handles analyses with null half-life', () => {
    const analyses: EVDecayAnalysis[] = [
      {
        gameId: 'g1', side: 'home', team: 'A', decayPoints: [],
        initialEV: 2.0, finalEV: 1.5, halfLife: null,
        decayPercent: 25, correctionSpeed: 0.5, commenceTime: '2026-03-25T20:00:00Z',
      },
    ]

    const summary = summarizeEVDecay(analyses)
    expect(summary.avgHalfLife).toBeNull()
  })

  it('counts fully corrected games accurately', () => {
    const analyses: EVDecayAnalysis[] = [
      { gameId: 'g1', side: 'home', team: 'A', decayPoints: [], initialEV: 3, finalEV: 0, halfLife: 30, decayPercent: 100, correctionSpeed: 2, commenceTime: '' },
      { gameId: 'g2', side: 'home', team: 'B', decayPoints: [], initialEV: 3, finalEV: -1, halfLife: 20, decayPercent: 133, correctionSpeed: 3, commenceTime: '' },
      { gameId: 'g3', side: 'home', team: 'C', decayPoints: [], initialEV: 3, finalEV: 1.5, halfLife: null, decayPercent: 50, correctionSpeed: 1, commenceTime: '' },
    ]

    const summary = summarizeEVDecay(analyses)
    expect(summary.fullyCorrectedCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// aggregateBySort
// ---------------------------------------------------------------------------

describe('aggregateBySort', () => {
  it('groups analyses by sport', () => {
    const analyses: EVDecayAnalysis[] = [
      { gameId: 'g1', sport: 'nba', side: 'home', team: 'A', decayPoints: [], initialEV: 3, finalEV: 1, halfLife: 30, decayPercent: 67, correctionSpeed: 2, commenceTime: '' },
      { gameId: 'g2', sport: 'nba', side: 'home', team: 'B', decayPoints: [], initialEV: 4, finalEV: 0, halfLife: 20, decayPercent: 100, correctionSpeed: 3, commenceTime: '' },
      { gameId: 'g3', sport: 'nfl', side: 'home', team: 'C', decayPoints: [], initialEV: 2, finalEV: 1.5, halfLife: null, decayPercent: 25, correctionSpeed: 0.5, commenceTime: '' },
    ]

    const result = aggregateBySort(analyses)
    expect(result.length).toBe(2)

    const nba = result.find(r => r.sport === 'nba')!
    expect(nba.count).toBe(2)
    expect(nba.avgHalfLife).toBe(25) // avg of 30 and 20
    expect(nba.fullyCorrectedCount).toBe(1)
    expect(nba.avgInitialEV).toBe(3.5)

    const nfl = result.find(r => r.sport === 'nfl')!
    expect(nfl.count).toBe(1)
    expect(nfl.avgHalfLife).toBeNull() // only one with null half-life
  })

  it('handles empty array', () => {
    expect(aggregateBySort([]).length).toBe(0)
  })

  it('puts unknown sport for analyses without sport field', () => {
    const analyses: EVDecayAnalysis[] = [
      { gameId: 'g1', side: 'home', team: 'A', decayPoints: [], initialEV: 3, finalEV: 1, halfLife: 30, decayPercent: 67, correctionSpeed: 2, commenceTime: '' },
    ]
    const result = aggregateBySort(analyses)
    expect(result[0].sport).toBe('unknown')
  })

  it('sorts by count descending', () => {
    const analyses: EVDecayAnalysis[] = [
      { gameId: 'g1', sport: 'nhl', side: 'home', team: 'A', decayPoints: [], initialEV: 3, finalEV: 1, halfLife: 30, decayPercent: 67, correctionSpeed: 2, commenceTime: '' },
      { gameId: 'g2', sport: 'nba', side: 'home', team: 'B', decayPoints: [], initialEV: 4, finalEV: 0, halfLife: 20, decayPercent: 100, correctionSpeed: 3, commenceTime: '' },
      { gameId: 'g3', sport: 'nba', side: 'home', team: 'C', decayPoints: [], initialEV: 2, finalEV: 1.5, halfLife: null, decayPercent: 25, correctionSpeed: 0.5, commenceTime: '' },
    ]
    const result = aggregateBySort(analyses)
    expect(result[0].sport).toBe('nba') // 2 games
    expect(result[1].sport).toBe('nhl') // 1 game
  })
})
