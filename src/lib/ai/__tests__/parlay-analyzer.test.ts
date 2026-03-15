/**
 * Parlay analyzer tests.
 *
 * Covers:
 *  - Type compliance for ParlayLeg and ParlayAnalysis
 *  - Validation: analyzeParlay throws for <2 and >10 legs (Anthropic SDK mocked)
 *  - Odds conversion math: americanToDecimal, americanToImplied, decimalToAmerican
 *    tested through the computed fields combinedOdds / impliedProbability /
 *    payoutMultiplier returned by analyzeParlay (Anthropic SDK mocked for those)
 *  - ParlayAnalysis interface shape — all required fields present
 *  - recommendation must be 'bet' | 'pass' | 'reduce'
 *  - risk in each legAnalysis must be 'low' | 'medium' | 'high'
 *  - disclaimer must include "informational purposes"
 *  - assertDisclaimer safety net: missing / invalid disclaimer is replaced
 *
 * The Anthropic SDK is mocked via vi.mock for any test that exercises
 * analyzeParlay end-to-end.  Pure conversion math is verified by checking
 * the derived numeric fields returned by analyzeParlay.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AI_DISCLAIMER } from '@/lib/ai/analysis'
import type { ParlayLeg, ParlayAnalysis } from '@/lib/ai/parlay-analyzer'

// ---------------------------------------------------------------------------
// Anthropic SDK mock
//
// The module under test calls `new Anthropic(...)`, so the default export must
// be a constructor function (not a plain arrow function).  We store the
// per-test payload in `mockClaudePayload` and let `mockCreate` read it when
// invoked so individual tests can override only the fields they care about.
// ---------------------------------------------------------------------------

let mockClaudePayload: Record<string, unknown> = {}

const mockCreate = vi.fn(async () => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(mockClaudePayload),
    },
  ],
}))

vi.mock('@anthropic-ai/sdk', () => {
  // Must use `function` so it is usable as a constructor with `new`.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function MockAnthropic(_opts: unknown) {
    return { messages: { create: mockCreate } }
  }
  return { default: MockAnthropic }
})

// Prevent getAnthropicApiKey from throwing due to missing env var.
vi.mock('@/lib/env', () => ({
  getAnthropicApiKey: vi.fn().mockReturnValue('test-key'),
}))

// Import after mocks are registered.
const { analyzeParlay } = await import('@/lib/ai/parlay-analyzer')

// ---------------------------------------------------------------------------
// Helper: minimal valid Claude response payload
// ---------------------------------------------------------------------------

function basePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    estimatedTrueProbability: 30,
    legAnalyses: [
      { description: 'Lakers ML', confidence: 60, risk: 'medium', note: 'Solid home team.' },
      { description: 'Celtics ML', confidence: 55, risk: 'low', note: 'Good matchup.' },
    ],
    correlationWarnings: [],
    recommendation: 'pass',
    summary: 'This parlay carries significant vig. Proceed with caution.',
    ...overrides,
  }
}

// Helper: build N minimal valid legs, all at -110 odds.
function legs(n: number): ParlayLeg[] {
  return Array.from({ length: n }, (_, i) => ({
    description: `Leg ${i + 1}`,
    odds: -110,
    sport: 'nba',
  }))
}

// ---------------------------------------------------------------------------
// 1. Type compliance: ParlayLeg interface
// ---------------------------------------------------------------------------

describe('ParlayLeg type compliance', () => {
  it('accepts a well-formed leg with negative odds', () => {
    const leg: ParlayLeg = { description: 'Lakers ML', odds: -150, sport: 'nba' }
    expect(leg.description).toBe('Lakers ML')
    expect(typeof leg.odds).toBe('number')
    expect(leg.sport).toBe('nba')
  })

  it('accepts positive American odds', () => {
    const leg: ParlayLeg = { description: 'Dog ML', odds: +350, sport: 'nfl' }
    expect(leg.odds).toBeGreaterThan(0)
  })

  it('accepts negative American odds', () => {
    const leg: ParlayLeg = { description: 'Fav ML', odds: -220, sport: 'nba' }
    expect(leg.odds).toBeLessThan(0)
  })

  it('sport field accepts all four supported sports', () => {
    for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) {
      const leg: ParlayLeg = { description: 'Test', odds: -110, sport }
      expect(leg.sport).toBe(sport)
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Type compliance: ParlayAnalysis interface shape
// ---------------------------------------------------------------------------

describe('ParlayAnalysis type compliance', () => {
  it('a well-formed analysis satisfies the interface', () => {
    const analysis: ParlayAnalysis = {
      legs: [
        { description: 'Lakers ML', odds: -150, sport: 'nba' },
        { description: 'Celtics ML', odds: +120, sport: 'nba' },
      ],
      combinedOdds: 50,
      impliedProbability: 0.28,
      payoutMultiplier: 2.5,
      assessment: {
        isPositiveEV: false,
        estimatedTrueProbability: 22,
        expectedValue: -0.18,
        reasoning: 'Both legs carry significant vig.',
      },
      legAnalyses: [
        { description: 'Lakers ML', confidence: 62, risk: 'medium', note: 'Strong at home.' },
        { description: 'Celtics ML', confidence: 55, risk: 'low', note: 'Nice value.' },
      ],
      correlationWarnings: [],
      recommendation: 'pass',
      summary: 'High vig. Avoid.',
      disclaimer: AI_DISCLAIMER,
    }

    expect(analysis).toHaveProperty('legs')
    expect(analysis).toHaveProperty('combinedOdds')
    expect(analysis).toHaveProperty('impliedProbability')
    expect(analysis).toHaveProperty('payoutMultiplier')
    expect(analysis).toHaveProperty('assessment')
    expect(analysis).toHaveProperty('legAnalyses')
    expect(analysis).toHaveProperty('correlationWarnings')
    expect(analysis).toHaveProperty('recommendation')
    expect(analysis).toHaveProperty('summary')
    expect(analysis).toHaveProperty('disclaimer')
  })

  it('assessment sub-object has all required fields', () => {
    const assessment: ParlayAnalysis['assessment'] = {
      isPositiveEV: true,
      estimatedTrueProbability: 45,
      expectedValue: 0.12,
      reasoning: 'Sharp line movement.',
    }
    expect(typeof assessment.isPositiveEV).toBe('boolean')
    expect(typeof assessment.estimatedTrueProbability).toBe('number')
    expect(typeof assessment.expectedValue).toBe('number')
    expect(typeof assessment.reasoning).toBe('string')
  })

  it('legAnalysis entries have all required fields', () => {
    const la: ParlayAnalysis['legAnalyses'][number] = {
      description: 'Over 220.5',
      confidence: 70,
      risk: 'high',
      note: 'High-scoring game expected.',
    }
    expect(la.description).toBeTruthy()
    expect(la.confidence).toBeGreaterThanOrEqual(0)
    expect(la.confidence).toBeLessThanOrEqual(100)
    expect(['low', 'medium', 'high']).toContain(la.risk)
    expect(typeof la.note).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// 3. Validation: analyzeParlay throws for invalid leg counts
// ---------------------------------------------------------------------------

describe('analyzeParlay input validation', () => {
  beforeEach(() => {
    mockClaudePayload = basePayload()
  })

  it('throws when fewer than 2 legs are provided', async () => {
    await expect(
      analyzeParlay([{ description: 'Solo leg', odds: -110, sport: 'nba' }])
    ).rejects.toThrow('at least 2 legs')
  })

  it('throws for an empty legs array', async () => {
    await expect(analyzeParlay([])).rejects.toThrow('at least 2 legs')
  })

  it('throws when more than 10 legs are provided', async () => {
    await expect(analyzeParlay(legs(11))).rejects.toThrow('Maximum 10 legs')
  })

  it('throws for 12 legs', async () => {
    await expect(analyzeParlay(legs(12))).rejects.toThrow('Maximum 10 legs')
  })

  it('does not throw for exactly 2 legs', async () => {
    await expect(analyzeParlay(legs(2))).resolves.toBeDefined()
  })

  it('does not throw for exactly 10 legs', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: Array.from({ length: 10 }, (_, i) => ({
        description: `Leg ${i + 1}`,
        confidence: 55,
        risk: 'medium',
        note: 'Test leg.',
      })),
    })
    await expect(analyzeParlay(legs(10))).resolves.toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 4. Odds conversion math — tested through returned payoutMultiplier
//
//    americanToDecimal:
//      +150  → 150/100 + 1 = 2.5
//      +100  → 100/100 + 1 = 2.0
//      -200  → 100/200 + 1 = 1.5
//      -110  → 100/110 + 1 ≈ 1.9091
//      +300  → 300/100 + 1 = 4.0
//
//    payoutMultiplier = product of all americanToDecimal(leg.odds)
// ---------------------------------------------------------------------------

describe('Odds conversion math via payoutMultiplier (americanToDecimal)', () => {
  beforeEach(() => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 60, risk: 'medium', note: '' },
      ],
    })
  })

  it('+150 and +100: combined decimal = 2.5 * 2.0 = 5.0', async () => {
    const result = await analyzeParlay([
      { description: 'A', odds: +150, sport: 'nba' },
      { description: 'B', odds: +100, sport: 'nba' },
    ])
    expect(result.payoutMultiplier).toBeCloseTo(5.0, 4)
  })

  it('-200 and -200: combined decimal = 1.5 * 1.5 = 2.25', async () => {
    const result = await analyzeParlay([
      { description: 'A', odds: -200, sport: 'nba' },
      { description: 'B', odds: -200, sport: 'nba' },
    ])
    expect(result.payoutMultiplier).toBeCloseTo(2.25, 4)
  })

  it('-110 and -110: combined decimal = (100/110+1)^2', async () => {
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: -110, sport: 'nba' },
    ])
    const expected = Math.pow(100 / 110 + 1, 2)
    expect(result.payoutMultiplier).toBeCloseTo(expected, 4)
  })

  it('+300 and +300: combined decimal = 4.0 * 4.0 = 16.0', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 50, risk: 'high', note: '' },
        { description: 'B', confidence: 50, risk: 'high', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: +300, sport: 'nfl' },
      { description: 'B', odds: +300, sport: 'nfl' },
    ])
    expect(result.payoutMultiplier).toBeCloseTo(16.0, 4)
  })
})

// ---------------------------------------------------------------------------
// 5. Odds conversion math — tested through returned impliedProbability
//
//    americanToImplied:
//      +150  → 100 / (150+100) = 0.4
//      -200  → 200 / (200+100) ≈ 0.6667
//      -110  → 110 / (110+100) ≈ 0.5238
//      +100  → 100 / (100+100) = 0.5
//
//    impliedProbability = product of all americanToImplied(leg.odds)
// ---------------------------------------------------------------------------

describe('Odds conversion math via impliedProbability (americanToImplied)', () => {
  it('+150 two-leg parlay: 0.4 * 0.4 = 0.16', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 60, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: +150, sport: 'nba' },
      { description: 'B', odds: +150, sport: 'nba' },
    ])
    expect(result.impliedProbability).toBeCloseTo(0.16, 4)
  })

  it('-200 two-leg parlay: (200/300)^2 ≈ 0.4444', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 60, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -200, sport: 'nba' },
      { description: 'B', odds: -200, sport: 'nba' },
    ])
    expect(result.impliedProbability).toBeCloseTo((200 / 300) ** 2, 4)
  })

  it('-110 two-leg parlay: (110/210)^2', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 60, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: -110, sport: 'nba' },
    ])
    const singleImplied = 110 / 210
    expect(result.impliedProbability).toBeCloseTo(singleImplied * singleImplied, 4)
  })

  it('three-leg mixed parlay multiplies individual implied probabilities', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 60, risk: 'medium', note: '' },
        { description: 'C', confidence: 60, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: +100, sport: 'nfl' },
      { description: 'C', odds: -150, sport: 'mlb' },
    ])
    const implA = 110 / (110 + 100)
    const implB = 100 / (100 + 100)
    const implC = 150 / (150 + 100)
    expect(result.impliedProbability).toBeCloseTo(implA * implB * implC, 4)
  })

  it('impliedProbability is strictly between 0 and 1 for any valid parlay', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 55, risk: 'medium', note: '' },
        { description: 'B', confidence: 55, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: +120, sport: 'nfl' },
    ])
    expect(result.impliedProbability).toBeGreaterThan(0)
    expect(result.impliedProbability).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Odds conversion math — tested through returned combinedOdds
//
//    decimalToAmerican:
//      decimal >= 2  → Math.round((decimal-1) * 100)   (positive American)
//      decimal < 2   → Math.round(-100 / (decimal-1))  (negative American)
// ---------------------------------------------------------------------------

describe('Odds conversion math via combinedOdds (decimalToAmerican)', () => {
  it('+150 and -200 two-leg: decimal 3.75 → +275', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 60, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: +150, sport: 'nba' },
      { description: 'B', odds: -200, sport: 'nba' },
    ])
    // 2.5 * 1.5 = 3.75 → (3.75-1)*100 = 275
    expect(result.combinedOdds).toBe(275)
  })

  it('-200 and -200 two-leg: decimal 2.25 → +125', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 60, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -200, sport: 'nba' },
      { description: 'B', odds: -200, sport: 'nba' },
    ])
    // 1.5 * 1.5 = 2.25 → (2.25-1)*100 = 125
    expect(result.combinedOdds).toBe(125)
  })

  it('+100 and +100 two-leg: decimal 4.0 → +300', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 50, risk: 'medium', note: '' },
        { description: 'B', confidence: 50, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: +100, sport: 'nba' },
      { description: 'B', odds: +100, sport: 'nba' },
    ])
    // 2.0 * 2.0 = 4.0 → (4.0-1)*100 = +300
    expect(result.combinedOdds).toBe(300)
  })

  it('payoutMultiplier and combinedOdds are internally consistent', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 55, risk: 'medium', note: '' },
        { description: 'B', confidence: 55, risk: 'medium', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: +120, sport: 'nfl' },
    ])
    // payoutMultiplier is the combined decimal; combinedOdds must be its American form
    if (result.payoutMultiplier >= 2) {
      expect(result.combinedOdds).toBeGreaterThan(0)
      expect(result.combinedOdds).toBeCloseTo(
        Math.round((result.payoutMultiplier - 1) * 100),
        0
      )
    } else {
      expect(result.combinedOdds).toBeLessThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Recommendation values
// ---------------------------------------------------------------------------

describe('recommendation values', () => {
  const VALID_RECS = ['bet', 'pass', 'reduce'] as const

  it('passes through "bet" recommendation', async () => {
    mockClaudePayload = basePayload({ recommendation: 'bet' })
    const result = await analyzeParlay(legs(2))
    expect(result.recommendation).toBe('bet')
  })

  it('passes through "pass" recommendation', async () => {
    mockClaudePayload = basePayload({ recommendation: 'pass' })
    const result = await analyzeParlay(legs(2))
    expect(result.recommendation).toBe('pass')
  })

  it('passes through "reduce" recommendation', async () => {
    mockClaudePayload = basePayload({ recommendation: 'reduce' })
    const result = await analyzeParlay(legs(2))
    expect(result.recommendation).toBe('reduce')
  })

  it('falls back to "pass" for unknown recommendation value', async () => {
    mockClaudePayload = basePayload({ recommendation: 'yolo' })
    const result = await analyzeParlay(legs(2))
    expect(result.recommendation).toBe('pass')
  })

  it('falls back to "pass" for empty recommendation string', async () => {
    mockClaudePayload = basePayload({ recommendation: '' })
    const result = await analyzeParlay(legs(2))
    expect(result.recommendation).toBe('pass')
  })

  it('every returned recommendation is within the valid set', async () => {
    for (const rec of VALID_RECS) {
      mockClaudePayload = basePayload({ recommendation: rec })
      const result = await analyzeParlay(legs(2))
      expect(VALID_RECS).toContain(result.recommendation)
    }
  })
})

// ---------------------------------------------------------------------------
// 8. Risk levels in legAnalyses
// ---------------------------------------------------------------------------

describe('risk levels in legAnalyses', () => {
  const VALID_RISKS = ['low', 'medium', 'high'] as const

  it('preserves "low" risk level from Claude response', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 70, risk: 'low', note: 'Safe.' },
        { description: 'B', confidence: 70, risk: 'low', note: 'Safe.' },
      ],
    })
    const result = await analyzeParlay(legs(2))
    expect(result.legAnalyses[0].risk).toBe('low')
    expect(result.legAnalyses[1].risk).toBe('low')
  })

  it('preserves "medium" risk level from Claude response', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 55, risk: 'medium', note: 'Average.' },
        { description: 'B', confidence: 55, risk: 'medium', note: 'Average.' },
      ],
    })
    const result = await analyzeParlay(legs(2))
    expect(result.legAnalyses[0].risk).toBe('medium')
  })

  it('preserves "high" risk level from Claude response', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 35, risk: 'high', note: 'Risky.' },
        { description: 'B', confidence: 35, risk: 'high', note: 'Risky.' },
      ],
    })
    const result = await analyzeParlay(legs(2))
    expect(result.legAnalyses[0].risk).toBe('high')
  })

  it('falls back to "medium" for unrecognised risk string', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 50, risk: 'extreme', note: 'Bad.' },
        { description: 'B', confidence: 50, risk: 'critical', note: 'Bad.' },
      ],
    })
    const result = await analyzeParlay(legs(2))
    expect(result.legAnalyses[0].risk).toBe('medium')
    expect(result.legAnalyses[1].risk).toBe('medium')
  })

  it('all returned risk values are within the valid set', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 70, risk: 'low', note: '' },
        { description: 'B', confidence: 50, risk: 'medium', note: '' },
        { description: 'C', confidence: 30, risk: 'high', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: +120, sport: 'nfl' },
      { description: 'C', odds: +200, sport: 'mlb' },
    ])
    for (const la of result.legAnalyses) {
      expect(VALID_RISKS).toContain(la.risk)
    }
  })
})

// ---------------------------------------------------------------------------
// 9. Disclaimer enforcement
// ---------------------------------------------------------------------------

describe('disclaimer enforcement', () => {
  beforeEach(() => {
    mockClaudePayload = basePayload()
  })

  it('disclaimer is present in the returned analysis', async () => {
    const result = await analyzeParlay(legs(2))
    expect(result.disclaimer).toBeTruthy()
  })

  it('disclaimer contains "informational purposes"', async () => {
    const result = await analyzeParlay(legs(2))
    expect(result.disclaimer).toContain('informational purposes')
  })

  it('disclaimer matches the AI_DISCLAIMER constant exactly', async () => {
    const result = await analyzeParlay(legs(2))
    expect(result.disclaimer).toBe(AI_DISCLAIMER)
  })

  it('AI_DISCLAIMER contains all required legal phrases', () => {
    expect(AI_DISCLAIMER).toContain('informational purposes only')
    expect(AI_DISCLAIMER).toContain('not financial or betting advice')
    expect(AI_DISCLAIMER).toContain('gamble responsibly')
  })

  it('assertDisclaimer: invalid disclaimer text is replaced with AI_DISCLAIMER', () => {
    // Mirror the assertDisclaimer logic from the module to verify the rule itself.
    function assertDisclaimer<T extends { disclaimer: string }>(analysis: T): T {
      if (!analysis.disclaimer || !analysis.disclaimer.includes('informational purposes')) {
        analysis.disclaimer = AI_DISCLAIMER
      }
      return analysis
    }
    const bad = { disclaimer: 'wrong disclaimer text', summary: 'test' }
    expect(assertDisclaimer(bad).disclaimer).toBe(AI_DISCLAIMER)
  })

  it('assertDisclaimer: empty disclaimer is replaced with AI_DISCLAIMER', () => {
    function assertDisclaimer<T extends { disclaimer: string }>(analysis: T): T {
      if (!analysis.disclaimer || !analysis.disclaimer.includes('informational purposes')) {
        analysis.disclaimer = AI_DISCLAIMER
      }
      return analysis
    }
    const missing = { disclaimer: '', summary: 'test' }
    expect(assertDisclaimer(missing).disclaimer).toBe(AI_DISCLAIMER)
  })

  it('assertDisclaimer: valid disclaimer is passed through unchanged', () => {
    function assertDisclaimer<T extends { disclaimer: string }>(analysis: T): T {
      if (!analysis.disclaimer || !analysis.disclaimer.includes('informational purposes')) {
        analysis.disclaimer = AI_DISCLAIMER
      }
      return analysis
    }
    const good = { disclaimer: AI_DISCLAIMER, summary: 'test' }
    expect(assertDisclaimer(good).disclaimer).toBe(AI_DISCLAIMER)
  })
})

// ---------------------------------------------------------------------------
// 10. Full ParlayAnalysis shape returned by analyzeParlay
// ---------------------------------------------------------------------------

describe('ParlayAnalysis shape returned by analyzeParlay', () => {
  beforeEach(() => {
    mockClaudePayload = basePayload()
  })

  it('legs array in result mirrors the input', async () => {
    const input = legs(2)
    const result = await analyzeParlay(input)
    expect(result.legs).toHaveLength(2)
    expect(result.legs[0].description).toBe(input[0].description)
    expect(result.legs[1].description).toBe(input[1].description)
  })

  it('combinedOdds is a number', async () => {
    const result = await analyzeParlay(legs(2))
    expect(typeof result.combinedOdds).toBe('number')
  })

  it('impliedProbability is between 0 and 1 (exclusive)', async () => {
    const result = await analyzeParlay(legs(2))
    expect(result.impliedProbability).toBeGreaterThan(0)
    expect(result.impliedProbability).toBeLessThan(1)
  })

  it('payoutMultiplier is greater than 1', async () => {
    const result = await analyzeParlay(legs(2))
    expect(result.payoutMultiplier).toBeGreaterThan(1)
  })

  it('assessment.isPositiveEV is a boolean', async () => {
    const result = await analyzeParlay(legs(2))
    expect(typeof result.assessment.isPositiveEV).toBe('boolean')
  })

  it('assessment.estimatedTrueProbability is clamped to [0.1, 99.9]', async () => {
    mockClaudePayload = basePayload({ estimatedTrueProbability: 30 })
    const result = await analyzeParlay(legs(2))
    expect(result.assessment.estimatedTrueProbability).toBeGreaterThanOrEqual(0.1)
    expect(result.assessment.estimatedTrueProbability).toBeLessThanOrEqual(99.9)
  })

  it('assessment.estimatedTrueProbability clamps 200 → 99.9', async () => {
    mockClaudePayload = basePayload({ estimatedTrueProbability: 200 })
    const result = await analyzeParlay(legs(2))
    expect(result.assessment.estimatedTrueProbability).toBe(99.9)
  })

  it('assessment.estimatedTrueProbability clamps 0 → 0.1', async () => {
    mockClaudePayload = basePayload({ estimatedTrueProbability: 0 })
    const result = await analyzeParlay(legs(2))
    expect(result.assessment.estimatedTrueProbability).toBe(0.1)
  })

  it('assessment.expectedValue is a number', async () => {
    const result = await analyzeParlay(legs(2))
    expect(typeof result.assessment.expectedValue).toBe('number')
  })

  it('assessment.reasoning is a non-empty string', async () => {
    mockClaudePayload = basePayload({ summary: 'High vig parlay. Avoid.' })
    const result = await analyzeParlay(legs(2))
    expect(result.assessment.reasoning).toBeTruthy()
    expect(typeof result.assessment.reasoning).toBe('string')
  })

  it('legAnalyses has one entry per input leg', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 60, risk: 'medium', note: '' },
        { description: 'B', confidence: 55, risk: 'low', note: '' },
        { description: 'C', confidence: 45, risk: 'high', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: +120, sport: 'nfl' },
      { description: 'C', odds: +200, sport: 'mlb' },
    ])
    expect(result.legAnalyses).toHaveLength(3)
  })

  it('legAnalyses confidence is clamped to 0-100', async () => {
    mockClaudePayload = basePayload({
      legAnalyses: [
        { description: 'A', confidence: 150, risk: 'medium', note: '' },
        { description: 'B', confidence: -20, risk: 'low', note: '' },
      ],
    })
    const result = await analyzeParlay(legs(2))
    expect(result.legAnalyses[0].confidence).toBeLessThanOrEqual(100)
    expect(result.legAnalyses[1].confidence).toBeGreaterThanOrEqual(0)
  })

  it('correlationWarnings is an array', async () => {
    mockClaudePayload = basePayload({
      correlationWarnings: ['Both legs are from the same game'],
    })
    const result = await analyzeParlay(legs(2))
    expect(Array.isArray(result.correlationWarnings)).toBe(true)
  })

  it('correlationWarnings defaults to empty array when omitted', async () => {
    const { correlationWarnings: _cw, ...rest } = basePayload() // eslint-disable-line @typescript-eslint/no-unused-vars
    mockClaudePayload = rest as Record<string, unknown>
    const result = await analyzeParlay(legs(2))
    expect(Array.isArray(result.correlationWarnings)).toBe(true)
    expect(result.correlationWarnings).toHaveLength(0)
  })

  it('summary is a non-empty string', async () => {
    mockClaudePayload = basePayload({ summary: 'Avoid this parlay.' })
    const result = await analyzeParlay(legs(2))
    expect(typeof result.summary).toBe('string')
    expect(result.summary).toBeTruthy()
  })

  it('summary falls back to default when missing from Claude response', async () => {
    const { summary: _s, ...rest } = basePayload() // eslint-disable-line @typescript-eslint/no-unused-vars
    mockClaudePayload = rest as Record<string, unknown>
    const result = await analyzeParlay(legs(2))
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 11. isPositiveEV and expectedValue correctness
// ---------------------------------------------------------------------------

describe('isPositiveEV and expectedValue calculation', () => {
  it('is positive when true probability beats the implied payout threshold', async () => {
    // -110/-110: decimal = (100/110+1)^2 ≈ 3.6446
    // trueProbability = 40% → EV = 0.4*(3.6446-1) - 0.6 ≈ +0.458
    mockClaudePayload = basePayload({
      estimatedTrueProbability: 40,
      legAnalyses: [
        { description: 'A', confidence: 70, risk: 'low', note: '' },
        { description: 'B', confidence: 70, risk: 'low', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: -110, sport: 'nba' },
    ])
    expect(result.assessment.isPositiveEV).toBe(true)
    expect(result.assessment.expectedValue).toBeGreaterThan(0)
  })

  it('is negative when true probability is below breakeven', async () => {
    // -110/-110: decimal ≈ 3.6446
    // trueProbability = 20% → EV = 0.2*(3.6446-1) - 0.8 ≈ -0.271
    mockClaudePayload = basePayload({
      estimatedTrueProbability: 20,
      legAnalyses: [
        { description: 'A', confidence: 40, risk: 'high', note: '' },
        { description: 'B', confidence: 40, risk: 'high', note: '' },
      ],
    })
    const result = await analyzeParlay([
      { description: 'A', odds: -110, sport: 'nba' },
      { description: 'B', odds: -110, sport: 'nba' },
    ])
    expect(result.assessment.isPositiveEV).toBe(false)
    expect(result.assessment.expectedValue).toBeLessThan(0)
  })

  it('expectedValue is rounded to two decimal places', async () => {
    mockClaudePayload = basePayload({ estimatedTrueProbability: 30 })
    const result = await analyzeParlay(legs(2))
    const asString = result.assessment.expectedValue.toString()
    const decimalPart = asString.includes('.') ? asString.split('.')[1] : ''
    expect(decimalPart.length).toBeLessThanOrEqual(2)
  })
})
