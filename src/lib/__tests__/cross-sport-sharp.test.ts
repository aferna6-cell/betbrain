import { describe, it, expect } from 'vitest'
import {
  detectCrossSportCorrelations,
  createMovementEvent,
  getCrossSportSummary,
  DEFAULT_CONFIG,
  type LineMovementEvent,
  type CrossSportConfig,
} from '../cross-sport-sharp'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_MIN = 60 * 1000

function makeMovement(overrides: Partial<LineMovementEvent> = {}): LineMovementEvent {
  return {
    gameId: 'g1',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    market: 'moneyline',
    direction: 'home',
    magnitude: 10,
    timestamp: '2026-03-25T18:00:00Z',
    booksInAgreement: 4,
    totalBooks: 6,
    commenceTime: '2026-03-25T23:00:00Z',
    ...overrides,
  }
}

function timeOffset(base: string, offsetMin: number): string {
  return new Date(new Date(base).getTime() + offsetMin * MS_MIN).toISOString()
}

// ---------------------------------------------------------------------------
// detectCrossSportCorrelations
// ---------------------------------------------------------------------------

describe('detectCrossSportCorrelations', () => {
  it('returns empty for insufficient movements', () => {
    const result = detectCrossSportCorrelations([makeMovement()])
    expect(result).toHaveLength(0)
  })

  it('returns empty when all movements are from same sport', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base }),
      makeMovement({ gameId: 'g2', sport: 'nba', timestamp: timeOffset(base, 5) }),
      makeMovement({ gameId: 'g3', sport: 'nba', timestamp: timeOffset(base, 10) }),
    ]
    const result = detectCrossSportCorrelations(movements)
    expect(result).toHaveLength(0)
  })

  it('detects cross-sport correlation within time window', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', direction: 'home', timestamp: base }),
      makeMovement({ gameId: 'g2', sport: 'nhl', direction: 'home', timestamp: timeOffset(base, 5), homeTeam: 'Bruins', awayTeam: 'Canadiens' }),
      makeMovement({ gameId: 'g3', sport: 'mlb', direction: 'home', timestamp: timeOffset(base, 10), homeTeam: 'Yankees', awayTeam: 'Red Sox' }),
    ]

    const result = detectCrossSportCorrelations(movements)
    expect(result).toHaveLength(1)
    expect(result[0].sports).toContain('nba')
    expect(result[0].sports).toContain('nhl')
    expect(result[0].strength).toBeGreaterThan(0)
  })

  it('does not cluster movements outside the time window', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 60), homeTeam: 'Bruins', awayTeam: 'Canadiens' }),
      makeMovement({ gameId: 'g3', sport: 'mlb', timestamp: timeOffset(base, 120), homeTeam: 'Yankees', awayTeam: 'Red Sox' }),
    ]

    // Default window is 30 min, so 60 min apart should not cluster
    const result = detectCrossSportCorrelations(movements)
    expect(result).toHaveLength(0)
  })

  it('detects coordinated totals pattern', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', market: 'total', direction: 'under', timestamp: base }),
      makeMovement({ gameId: 'g2', sport: 'nhl', market: 'total', direction: 'under', timestamp: timeOffset(base, 5), homeTeam: 'Bruins', awayTeam: 'Canadiens' }),
      makeMovement({ gameId: 'g3', sport: 'mlb', market: 'total', direction: 'under', timestamp: timeOffset(base, 8), homeTeam: 'Yankees', awayTeam: 'Red Sox' }),
    ]

    const result = detectCrossSportCorrelations(movements)
    expect(result).toHaveLength(1)
    expect(result[0].pattern).toBe('coordinated-totals')
    expect(result[0].description).toContain('unders')
  })

  it('detects contrarian cluster (sharp on underdogs)', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', market: 'spread', direction: 'away', timestamp: base }),
      makeMovement({ gameId: 'g2', sport: 'nhl', market: 'moneyline', direction: 'away', timestamp: timeOffset(base, 3), homeTeam: 'Bruins', awayTeam: 'Canadiens' }),
      makeMovement({ gameId: 'g3', sport: 'nba', market: 'moneyline', direction: 'away', timestamp: timeOffset(base, 7), homeTeam: 'Bucks', awayTeam: 'Pistons' }),
    ]

    const result = detectCrossSportCorrelations(movements)
    expect(result).toHaveLength(1)
    expect(result[0].pattern).toBe('contrarian-cluster')
  })

  it('detects cross-sport steam for 3+ sports', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 2), homeTeam: 'Bruins', awayTeam: 'Canadiens' }),
      makeMovement({ gameId: 'g3', sport: 'mlb', timestamp: timeOffset(base, 4), homeTeam: 'Yankees', awayTeam: 'Red Sox' }),
      makeMovement({ gameId: 'g4', sport: 'nba', timestamp: timeOffset(base, 6), homeTeam: 'Bucks', awayTeam: 'Pistons' }),
      makeMovement({ gameId: 'g5', sport: 'nfl', timestamp: timeOffset(base, 8), homeTeam: 'Cowboys', awayTeam: 'Eagles' }),
    ]

    const result = detectCrossSportCorrelations(movements)
    expect(result).toHaveLength(1)
    expect(result[0].pattern).toBe('cross-sport-steam')
    expect(result[0].sports.length).toBeGreaterThanOrEqual(3)
  })

  it('filters out low book agreement movements', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base, booksInAgreement: 1, totalBooks: 6 }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 5), booksInAgreement: 1, totalBooks: 6, homeTeam: 'Bruins', awayTeam: 'Canadiens' }),
      makeMovement({ gameId: 'g3', sport: 'mlb', timestamp: timeOffset(base, 10), booksInAgreement: 1, totalBooks: 6, homeTeam: 'Yankees', awayTeam: 'Red Sox' }),
    ]

    // Agreement is 1/6 = 16.7%, below default 50% threshold
    const result = detectCrossSportCorrelations(movements)
    expect(result).toHaveLength(0)
  })

  it('applies custom config', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 5), homeTeam: 'Bruins', awayTeam: 'Canadiens' }),
    ]

    // With minMovements=2 and minSports=2, this should cluster
    const config: CrossSportConfig = {
      windowMinutes: 30,
      minSports: 2,
      minMovements: 2,
      minBookAgreement: 0.5,
    }
    const result = detectCrossSportCorrelations(movements, config)
    expect(result).toHaveLength(1)
  })

  it('assigns higher strength to tight clusters', () => {
    const base = '2026-03-25T18:00:00Z'

    const tightCluster = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base, magnitude: 15 }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 2), homeTeam: 'Bruins', awayTeam: 'Canadiens', magnitude: 15 }),
      makeMovement({ gameId: 'g3', sport: 'mlb', timestamp: timeOffset(base, 3), homeTeam: 'Yankees', awayTeam: 'Red Sox', magnitude: 15 }),
    ]

    const looseCluster = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base, magnitude: 3 }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 25), homeTeam: 'Bruins', awayTeam: 'Canadiens', magnitude: 3 }),
      makeMovement({ gameId: 'g3', sport: 'mlb', timestamp: timeOffset(base, 28), homeTeam: 'Yankees', awayTeam: 'Red Sox', magnitude: 3 }),
    ]

    const tightResult = detectCrossSportCorrelations(tightCluster)
    const looseResult = detectCrossSportCorrelations(looseCluster)

    expect(tightResult).toHaveLength(1)
    expect(looseResult).toHaveLength(1)
    expect(tightResult[0].strength).toBeGreaterThan(looseResult[0].strength)
  })

  it('sorts correlations by strength descending', () => {
    const base = '2026-03-25T18:00:00Z'
    // Create two separate time-separated clusters
    const movements = [
      // Cluster 1: tight, high magnitude
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base, magnitude: 20 }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 1), homeTeam: 'B', awayTeam: 'C', magnitude: 20 }),
      makeMovement({ gameId: 'g3', sport: 'mlb', timestamp: timeOffset(base, 2), homeTeam: 'Y', awayTeam: 'R', magnitude: 20 }),
      // Cluster 2: loose, low magnitude (separate time window)
      makeMovement({ gameId: 'g4', sport: 'nba', timestamp: timeOffset(base, 120), magnitude: 2, homeTeam: 'W', awayTeam: 'X' }),
      makeMovement({ gameId: 'g5', sport: 'nfl', timestamp: timeOffset(base, 145), homeTeam: 'D', awayTeam: 'E', magnitude: 2 }),
      makeMovement({ gameId: 'g6', sport: 'nhl', timestamp: timeOffset(base, 148), homeTeam: 'F', awayTeam: 'G', magnitude: 2 }),
    ]

    const result = detectCrossSportCorrelations(movements)
    if (result.length >= 2) {
      expect(result[0].strength).toBeGreaterThanOrEqual(result[1].strength)
    }
  })
})

// ---------------------------------------------------------------------------
// createMovementEvent
// ---------------------------------------------------------------------------

describe('createMovementEvent', () => {
  it('creates a movement event for moneyline', () => {
    const event = createMovementEvent(
      'g1', 'nba', 'Lakers', 'Celtics', 'moneyline',
      -110, -130, '2026-03-25T18:00:00Z', 4, 6, '2026-03-25T23:00:00Z'
    )
    expect(event).not.toBeNull()
    expect(event!.direction).toBe('home')  // negative movement = toward home favorite
    expect(event!.magnitude).toBe(20)
  })

  it('creates underdog movement for positive shift', () => {
    const event = createMovementEvent(
      'g1', 'nba', 'Lakers', 'Celtics', 'spread',
      -3, -1, '2026-03-25T18:00:00Z', 3, 5, '2026-03-25T23:00:00Z'
    )
    expect(event).not.toBeNull()
    expect(event!.direction).toBe('away')  // positive movement = toward away
  })

  it('creates total movement', () => {
    const event = createMovementEvent(
      'g1', 'nba', 'Lakers', 'Celtics', 'total',
      220, 223, '2026-03-25T18:00:00Z', 5, 6, '2026-03-25T23:00:00Z'
    )
    expect(event).not.toBeNull()
    expect(event!.direction).toBe('over')
    expect(event!.magnitude).toBe(3)
  })

  it('returns null for tiny movements', () => {
    const event = createMovementEvent(
      'g1', 'nba', 'Lakers', 'Celtics', 'moneyline',
      -110, -110.3, '2026-03-25T18:00:00Z', 2, 6, '2026-03-25T23:00:00Z'
    )
    expect(event).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getCrossSportSummary
// ---------------------------------------------------------------------------

describe('getCrossSportSummary', () => {
  it('returns zeros for empty correlations', () => {
    const result = getCrossSportSummary([])
    expect(result.total).toBe(0)
    expect(result.high).toBe(0)
    expect(result.topPattern).toBeNull()
  })

  it('counts by risk level', () => {
    const base = '2026-03-25T18:00:00Z'
    const movements = [
      makeMovement({ gameId: 'g1', sport: 'nba', timestamp: base, magnitude: 15 }),
      makeMovement({ gameId: 'g2', sport: 'nhl', timestamp: timeOffset(base, 2), homeTeam: 'B', awayTeam: 'C', magnitude: 15 }),
      makeMovement({ gameId: 'g3', sport: 'mlb', timestamp: timeOffset(base, 3), homeTeam: 'Y', awayTeam: 'R', magnitude: 15 }),
    ]

    const correlations = detectCrossSportCorrelations(movements)
    const summary = getCrossSportSummary(correlations)
    expect(summary.total).toBe(1)
    expect(summary.topPattern).not.toBeNull()
  })
})
