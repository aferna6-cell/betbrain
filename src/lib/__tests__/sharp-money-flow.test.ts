import { describe, it, expect } from 'vitest'
import {
  americanToImplied,
  estimatePublicSide,
  detectSharpSignals,
  detectSharpFlow,
  strengthLabel,
  strengthColor,
  type GameOddsTimeline,
  type OddsPoint,
} from '../sharp-money-flow'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePoint(
  bookmaker: string,
  homeOdds: number,
  awayOdds: number,
  timestamp: string,
  overrides: Partial<OddsPoint> = {}
): OddsPoint {
  return {
    bookmaker,
    homeOdds,
    awayOdds,
    spreadHome: null,
    spreadAway: null,
    spreadLine: null,
    totalOver: null,
    totalUnder: null,
    totalLine: null,
    timestamp,
    ...overrides,
  }
}

function makeTimeline(
  gameId: string,
  points: OddsPoint[],
  overrides: Partial<GameOddsTimeline> = {}
): GameOddsTimeline {
  return {
    gameId,
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    gameTime: '2026-03-24T19:00:00Z',
    points,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// americanToImplied
// ---------------------------------------------------------------------------

describe('americanToImplied', () => {
  it('converts negative odds correctly', () => {
    // -200 => 200/(200+100) = 66.67%
    expect(americanToImplied(-200)).toBeCloseTo(0.6667, 3)
  })

  it('converts positive odds correctly', () => {
    // +200 => 100/(200+100) = 33.33%
    expect(americanToImplied(200)).toBeCloseTo(0.3333, 3)
  })

  it('converts -110 (standard juice)', () => {
    expect(americanToImplied(-110)).toBeCloseTo(0.5238, 3)
  })

  it('handles 0 as even', () => {
    expect(americanToImplied(0)).toBe(0.5)
  })
})

// ---------------------------------------------------------------------------
// estimatePublicSide
// ---------------------------------------------------------------------------

describe('estimatePublicSide', () => {
  it('estimates public on heavy home favorite', () => {
    // Home -300, Away +250 → public should lean heavily home
    const pct = estimatePublicSide(-300, 250)
    expect(pct).toBeGreaterThan(60)
  })

  it('estimates public on away favorite', () => {
    // Home +200, Away -250 → public leans away
    const pct = estimatePublicSide(200, -250)
    expect(pct).toBeLessThan(40)
  })

  it('near 50% for pick-em', () => {
    const pct = estimatePublicSide(-110, -110)
    expect(pct).toBeCloseTo(50, 0)
  })

  it('caps at 85%', () => {
    const pct = estimatePublicSide(-1000, 700)
    expect(pct).toBeLessThanOrEqual(85)
  })

  it('floors at 15%', () => {
    const pct = estimatePublicSide(700, -1000)
    expect(pct).toBeGreaterThanOrEqual(15)
  })
})

// ---------------------------------------------------------------------------
// detectSharpSignals — RLM
// ---------------------------------------------------------------------------

describe('detectSharpSignals — RLM moneyline', () => {
  it('detects RLM when line moves against public favorite', () => {
    // Home is -200 favorite (public on home), but line moves to -170 (away from home)
    const points = [
      makePoint('fanduel', -200, 170, '2026-03-24T10:00:00Z'),
      makePoint('fanduel', -170, 145, '2026-03-24T14:00:00Z'),
    ]
    const timeline = makeTimeline('game1', points)
    const signals = detectSharpSignals(timeline)

    const rlm = signals.filter((s) => s.type === 'rlm' && s.market === 'moneyline')
    expect(rlm.length).toBeGreaterThanOrEqual(1)
    expect(rlm[0].side).toBe('away') // Sharp money on away
  })

  it('no signal for small movements', () => {
    const points = [
      makePoint('draftkings', -150, 130, '2026-03-24T10:00:00Z'),
      makePoint('draftkings', -148, 128, '2026-03-24T14:00:00Z'),
    ]
    const timeline = makeTimeline('game2', points)
    const signals = detectSharpSignals(timeline)
    const rlm = signals.filter((s) => s.type === 'rlm' && s.market === 'moneyline')
    expect(rlm).toHaveLength(0)
  })

  it('no signal when only one data point', () => {
    const points = [makePoint('draftkings', -150, 130, '2026-03-24T10:00:00Z')]
    const timeline = makeTimeline('game3', points)
    const signals = detectSharpSignals(timeline)
    const rlm = signals.filter((s) => s.type === 'rlm')
    expect(rlm).toHaveLength(0)
  })
})

describe('detectSharpSignals — RLM spread', () => {
  it('detects RLM when spread moves against public favorite', () => {
    // Home favorite at -5.5, but spread moves to -4.5 (less negative = toward away)
    const points = [
      makePoint('fanduel', -200, 170, '2026-03-24T10:00:00Z', {
        spreadLine: -5.5,
        spreadHome: -110,
        spreadAway: -110,
      }),
      makePoint('fanduel', -190, 160, '2026-03-24T14:00:00Z', {
        spreadLine: -4.5,
        spreadHome: -110,
        spreadAway: -110,
      }),
    ]
    const timeline = makeTimeline('game4', points)
    const signals = detectSharpSignals(timeline)
    const rlm = signals.filter((s) => s.type === 'rlm' && s.market === 'spread')
    expect(rlm.length).toBeGreaterThanOrEqual(1)
    expect(rlm[0].side).toBe('away')
  })

  it('no spread RLM without spread data', () => {
    const points = [
      makePoint('fanduel', -200, 170, '2026-03-24T10:00:00Z'),
      makePoint('fanduel', -170, 145, '2026-03-24T14:00:00Z'),
    ]
    const timeline = makeTimeline('game5', points)
    const signals = detectSharpSignals(timeline)
    const rlm = signals.filter((s) => s.type === 'rlm' && s.market === 'spread')
    expect(rlm).toHaveLength(0)
  })
})

describe('detectSharpSignals — RLM total', () => {
  it('detects RLM when total drops (sharp on under)', () => {
    // Public leans over, but total drops
    const points = [
      makePoint('fanduel', -110, -110, '2026-03-24T10:00:00Z', {
        totalLine: 225.5,
        totalOver: -110,
        totalUnder: -110,
      }),
      makePoint('fanduel', -110, -110, '2026-03-24T14:00:00Z', {
        totalLine: 224,
        totalOver: -110,
        totalUnder: -110,
      }),
    ]
    const timeline = makeTimeline('game6', points)
    const signals = detectSharpSignals(timeline)
    const rlm = signals.filter((s) => s.type === 'rlm' && s.market === 'total')
    expect(rlm.length).toBeGreaterThanOrEqual(1)
    expect(rlm[0].side).toBe('under')
  })
})

// ---------------------------------------------------------------------------
// detectSharpSignals — Late steam
// ---------------------------------------------------------------------------

describe('detectSharpSignals — late steam', () => {
  it('detects late steam within 2 hours of game time', () => {
    // Game at 19:00, movement at 17:30 and 18:30
    const points = [
      makePoint('fanduel', -150, 130, '2026-03-24T17:30:00Z'),
      makePoint('fanduel', -200, 170, '2026-03-24T18:30:00Z'),
      makePoint('draftkings', -155, 135, '2026-03-24T17:45:00Z'),
      makePoint('draftkings', -190, 160, '2026-03-24T18:45:00Z'),
    ]
    const timeline = makeTimeline('game7', points, {
      gameTime: '2026-03-24T19:00:00Z',
    })
    const signals = detectSharpSignals(timeline)
    const steam = signals.filter((s) => s.type === 'late-steam')
    expect(steam.length).toBeGreaterThanOrEqual(1)
    expect(steam[0].side).toBe('home') // Movement toward home
  })

  it('no late steam for early movements', () => {
    // Game at 19:00, movement at 10:00 and 12:00 — too early
    const points = [
      makePoint('fanduel', -150, 130, '2026-03-24T10:00:00Z'),
      makePoint('fanduel', -200, 170, '2026-03-24T12:00:00Z'),
    ]
    const timeline = makeTimeline('game8', points, {
      gameTime: '2026-03-24T19:00:00Z',
    })
    const signals = detectSharpSignals(timeline)
    const steam = signals.filter((s) => s.type === 'late-steam')
    expect(steam).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// detectSharpSignals — Opening value
// ---------------------------------------------------------------------------

describe('detectSharpSignals — opening value', () => {
  it('detects significant opening line movement', () => {
    const points = [
      makePoint('fanduel', -120, 100, '2026-03-23T10:00:00Z'),
      makePoint('fanduel', -180, 155, '2026-03-24T14:00:00Z'),
    ]
    const timeline = makeTimeline('game9', points)
    const signals = detectSharpSignals(timeline)
    const ov = signals.filter((s) => s.type === 'opening-value')
    expect(ov.length).toBeGreaterThanOrEqual(1)
    expect(ov[0].side).toBe('home') // Line moved toward home
  })

  it('no opening value for small moves', () => {
    const points = [
      makePoint('fanduel', -150, 130, '2026-03-24T10:00:00Z'),
      makePoint('fanduel', -155, 133, '2026-03-24T14:00:00Z'),
    ]
    const timeline = makeTimeline('game10', points)
    const signals = detectSharpSignals(timeline)
    const ov = signals.filter((s) => s.type === 'opening-value')
    expect(ov).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// detectSharpFlow
// ---------------------------------------------------------------------------

describe('detectSharpFlow', () => {
  it('aggregates signals across multiple games', () => {
    const timelines = [
      makeTimeline('g1', [
        makePoint('fanduel', -200, 170, '2026-03-24T10:00:00Z'),
        makePoint('fanduel', -170, 145, '2026-03-24T14:00:00Z'),
      ]),
      makeTimeline('g2', [
        makePoint('fanduel', -120, 100, '2026-03-23T10:00:00Z'),
        makePoint('fanduel', -180, 155, '2026-03-24T14:00:00Z'),
      ]),
    ]
    const summary = detectSharpFlow(timelines)
    expect(summary.totalSignals).toBeGreaterThan(0)
  })

  it('returns empty summary for empty input', () => {
    const summary = detectSharpFlow([])
    expect(summary.totalSignals).toBe(0)
    expect(summary.strongSignals).toHaveLength(0)
  })

  it('identifies multi-signal games', () => {
    // Game with both RLM and opening value movement
    const points = [
      makePoint('fanduel', -120, 100, '2026-03-23T10:00:00Z'),
      makePoint('fanduel', -180, 155, '2026-03-24T14:00:00Z'),
      makePoint('draftkings', -125, 105, '2026-03-23T10:00:00Z'),
      makePoint('draftkings', -175, 150, '2026-03-24T14:00:00Z'),
      // Late steam points too
      makePoint('fanduel', -170, 145, '2026-03-24T17:30:00Z'),
      makePoint('fanduel', -195, 165, '2026-03-24T18:30:00Z'),
    ]
    const timeline = makeTimeline('multi', points, {
      gameTime: '2026-03-24T19:00:00Z',
    })
    const summary = detectSharpFlow([timeline])
    expect(summary.totalSignals).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// strengthLabel / strengthColor
// ---------------------------------------------------------------------------

describe('strengthLabel', () => {
  it('returns Extreme for 5', () => expect(strengthLabel(5)).toBe('Extreme'))
  it('returns Strong for 4', () => expect(strengthLabel(4)).toBe('Strong'))
  it('returns Moderate for 3', () => expect(strengthLabel(3)).toBe('Moderate'))
  it('returns Mild for 2', () => expect(strengthLabel(2)).toBe('Mild'))
  it('returns Weak for 1', () => expect(strengthLabel(1)).toBe('Weak'))
})

describe('strengthColor', () => {
  it('returns red for 5', () => expect(strengthColor(5)).toContain('red'))
  it('returns orange for 4', () => expect(strengthColor(4)).toContain('orange'))
  it('returns yellow for 3', () => expect(strengthColor(3)).toContain('yellow'))
  it('returns blue for 2', () => expect(strengthColor(2)).toContain('blue'))
  it('returns muted for 1', () => expect(strengthColor(1)).toContain('muted'))
})
