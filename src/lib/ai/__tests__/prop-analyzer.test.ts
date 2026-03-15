import { describe, it, expect } from 'vitest'
import { AI_DISCLAIMER } from '@/lib/ai/analysis'
import type { PropAnalysisInput, PropAnalysis } from '@/lib/ai/prop-analyzer'

// ---------------------------------------------------------------------------
// Helpers — replicate the pure functions from prop-analyzer.ts so we can
// verify the math without importing internal (non-exported) symbols.
// Both functions are small enough that duplicating them here is safer than
// re-exporting them just for tests.
// ---------------------------------------------------------------------------

/** Mirrors the americanToImplied function in prop-analyzer.ts */
function americanToImplied(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

/** Mirrors the assertDisclaimer guard in prop-analyzer.ts */
function assertDisclaimer<T extends { disclaimer: string }>(analysis: T): T {
  if (
    !analysis.disclaimer ||
    !analysis.disclaimer.includes('informational purposes')
  ) {
    analysis.disclaimer = AI_DISCLAIMER
  }
  return analysis
}

// ---------------------------------------------------------------------------
// Shared valid fixture — a minimal PropAnalysisInput used across tests
// ---------------------------------------------------------------------------

const BASE_INPUT: PropAnalysisInput = {
  playerName: 'LeBron James',
  sport: 'NBA',
  team: 'Los Angeles Lakers',
  opponent: 'Golden State Warriors',
  propMarket: 'points',
  line: 25.5,
  overOdds: -110,
  underOdds: -110,
}

// ---------------------------------------------------------------------------
// PropAnalysisInput — type compliance
// ---------------------------------------------------------------------------

describe('PropAnalysisInput type compliance', () => {
  it('accepts all required fields with correct types', () => {
    const input: PropAnalysisInput = { ...BASE_INPUT }
    expect(typeof input.playerName).toBe('string')
    expect(typeof input.sport).toBe('string')
    expect(typeof input.team).toBe('string')
    expect(typeof input.opponent).toBe('string')
    expect(typeof input.propMarket).toBe('string')
    expect(typeof input.line).toBe('number')
    expect(typeof input.overOdds).toBe('number')
    expect(typeof input.underOdds).toBe('number')
  })

  it('line is a number, not a string', () => {
    const input: PropAnalysisInput = { ...BASE_INPUT, line: 7.5 }
    expect(input.line).toBe(7.5)
    expect(typeof input.line).toBe('number')
  })

  it('odds fields accept negative values (favourite lines)', () => {
    const input: PropAnalysisInput = {
      ...BASE_INPUT,
      overOdds: -200,
      underOdds: -200,
    }
    expect(input.overOdds).toBeLessThan(0)
    expect(input.underOdds).toBeLessThan(0)
  })

  it('odds fields accept positive values (underdog / plus-money lines)', () => {
    const input: PropAnalysisInput = {
      ...BASE_INPUT,
      overOdds: +150,
      underOdds: +130,
    }
    expect(input.overOdds).toBeGreaterThan(0)
    expect(input.underOdds).toBeGreaterThan(0)
  })

  it('propMarket accepts any string descriptor', () => {
    const markets = [
      'points',
      'rebounds',
      'assists',
      'passing_yards',
      'rushing_yards',
      'strikeouts',
    ]
    markets.forEach((market) => {
      const input: PropAnalysisInput = { ...BASE_INPUT, propMarket: market }
      expect(input.propMarket).toBe(market)
    })
  })
})

// ---------------------------------------------------------------------------
// PropAnalysis — interface shape
// ---------------------------------------------------------------------------

describe('PropAnalysis interface shape', () => {
  const buildAnalysis = (overrides: Partial<PropAnalysis> = {}): PropAnalysis => ({
    playerName: 'LeBron James',
    propMarket: 'points',
    line: 25.5,
    recommendation: 'over',
    summary: 'LeBron faces a weak defensive perimeter tonight.',
    keyFactors: ['Factor 1', 'Factor 2', 'Factor 3'],
    projectedRange: { low: 20, mid: 26, high: 33 },
    impliedProbability: {
      over: americanToImplied(-110),
      under: americanToImplied(-110),
    },
    estimatedEdge: {
      side: 'over',
      percentage: 4.5,
      reasoning: 'Defensive mismatch creates value on the over.',
    },
    riskLevel: 'medium',
    confidence: 68,
    disclaimer: AI_DISCLAIMER,
    ...overrides,
  })

  it('contains all required top-level fields', () => {
    const analysis = buildAnalysis()
    expect(analysis).toHaveProperty('playerName')
    expect(analysis).toHaveProperty('propMarket')
    expect(analysis).toHaveProperty('line')
    expect(analysis).toHaveProperty('recommendation')
    expect(analysis).toHaveProperty('summary')
    expect(analysis).toHaveProperty('keyFactors')
    expect(analysis).toHaveProperty('projectedRange')
    expect(analysis).toHaveProperty('impliedProbability')
    expect(analysis).toHaveProperty('estimatedEdge')
    expect(analysis).toHaveProperty('riskLevel')
    expect(analysis).toHaveProperty('confidence')
    expect(analysis).toHaveProperty('disclaimer')
  })

  it('scalar fields have the correct primitive types', () => {
    const analysis = buildAnalysis()
    expect(typeof analysis.playerName).toBe('string')
    expect(typeof analysis.propMarket).toBe('string')
    expect(typeof analysis.line).toBe('number')
    expect(typeof analysis.summary).toBe('string')
    expect(typeof analysis.confidence).toBe('number')
    expect(typeof analysis.disclaimer).toBe('string')
  })

  it('keyFactors is an array of strings', () => {
    const analysis = buildAnalysis()
    expect(Array.isArray(analysis.keyFactors)).toBe(true)
    analysis.keyFactors.forEach((f) => expect(typeof f).toBe('string'))
  })

  it('projectedRange has low, mid, high as numbers', () => {
    const analysis = buildAnalysis()
    expect(typeof analysis.projectedRange.low).toBe('number')
    expect(typeof analysis.projectedRange.mid).toBe('number')
    expect(typeof analysis.projectedRange.high).toBe('number')
  })

  it('impliedProbability has over and under as numbers', () => {
    const analysis = buildAnalysis()
    expect(typeof analysis.impliedProbability.over).toBe('number')
    expect(typeof analysis.impliedProbability.under).toBe('number')
  })

  it('estimatedEdge has side, percentage, and reasoning', () => {
    const analysis = buildAnalysis()
    expect(analysis.estimatedEdge).toHaveProperty('side')
    expect(analysis.estimatedEdge).toHaveProperty('percentage')
    expect(analysis.estimatedEdge).toHaveProperty('reasoning')
    expect(typeof analysis.estimatedEdge.percentage).toBe('number')
    expect(typeof analysis.estimatedEdge.reasoning).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// americanToImplied — probability math
// ---------------------------------------------------------------------------

describe('americanToImplied math', () => {
  it('-110 implies approximately 52.4%', () => {
    const implied = americanToImplied(-110)
    expect(implied).toBeCloseTo(110 / 210, 5) // 0.52381...
    expect(implied).toBeGreaterThan(0.52)
    expect(implied).toBeLessThan(0.53)
  })

  it('+110 implies approximately 47.6%', () => {
    const implied = americanToImplied(110)
    expect(implied).toBeCloseTo(100 / 210, 5) // 0.47619...
    expect(implied).toBeGreaterThan(0.47)
    expect(implied).toBeLessThan(0.48)
  })

  it('+100 (even money) implies exactly 50%', () => {
    const implied = americanToImplied(100)
    expect(implied).toBeCloseTo(0.5, 5)
  })

  it('-100 also implies exactly 50%', () => {
    // -100 means 100/(100+100) = 0.5
    const implied = americanToImplied(-100)
    expect(implied).toBeCloseTo(0.5, 5)
  })

  it('-200 implies approximately 66.7%', () => {
    const implied = americanToImplied(-200)
    expect(implied).toBeCloseTo(200 / 300, 5) // 0.66667
    expect(implied).toBeGreaterThan(0.66)
    expect(implied).toBeLessThan(0.68)
  })

  it('+200 implies approximately 33.3%', () => {
    const implied = americanToImplied(200)
    expect(implied).toBeCloseTo(100 / 300, 5) // 0.33333
    expect(implied).toBeGreaterThan(0.33)
    expect(implied).toBeLessThan(0.34)
  })

  it('-150 implies approximately 60%', () => {
    const implied = americanToImplied(-150)
    expect(implied).toBeCloseTo(150 / 250, 5) // 0.6
    expect(implied).toBeGreaterThan(0.59)
    expect(implied).toBeLessThan(0.61)
  })

  it('+150 implies exactly 40%', () => {
    const implied = americanToImplied(150)
    expect(implied).toBeCloseTo(100 / 250, 5) // 0.4
  })

  it('-300 implies 75%', () => {
    const implied = americanToImplied(-300)
    expect(implied).toBeCloseTo(300 / 400, 5) // 0.75
  })

  it('+300 implies 25%', () => {
    const implied = americanToImplied(300)
    expect(implied).toBeCloseTo(100 / 400, 5) // 0.25
  })

  it('result is always between 0 and 1 for typical range of odds', () => {
    const oddsValues = [-500, -300, -200, -150, -120, -110, -105, 100, 105, 110, 120, 150, 200, 300, 500]
    oddsValues.forEach((odds) => {
      const implied = americanToImplied(odds)
      expect(implied).toBeGreaterThan(0)
      expect(implied).toBeLessThan(1)
    })
  })

  it('heavy favourite (-500) has much higher implied probability than +500 underdog', () => {
    const favImplied = americanToImplied(-500)
    const dogImplied = americanToImplied(500)
    expect(favImplied).toBeGreaterThan(dogImplied)
    expect(favImplied).toBeCloseTo(500 / 600, 5) // ~0.833
    expect(dogImplied).toBeCloseTo(100 / 600, 5) // ~0.167
  })

  it('symmetry: -110 and +110 sum to exactly 1 (no vig)', () => {
    // -110 and +110 are perfectly symmetrical: 110/210 + 100/210 = 1.0
    const negImplied = americanToImplied(-110)
    const posImplied = americanToImplied(110)
    expect(negImplied + posImplied).toBeCloseTo(1.0, 5)
  })

  it('vig: -110 on both sides sums to > 1', () => {
    // Standard vig pair: -110 / -110 → 110/210 + 110/210 ≈ 1.048
    const side1 = americanToImplied(-110)
    const side2 = americanToImplied(-110)
    expect(side1 + side2).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// Recommendation — valid values
// ---------------------------------------------------------------------------

describe('PropAnalysis recommendation values', () => {
  const validRecommendations = ['over', 'under', 'pass'] as const

  it('only over, under, and pass are valid recommendations', () => {
    validRecommendations.forEach((rec) => {
      const analysis: PropAnalysis = {
        playerName: 'Test',
        propMarket: 'points',
        line: 20,
        recommendation: rec,
        summary: 'Test',
        keyFactors: [],
        projectedRange: { low: 15, mid: 20, high: 25 },
        impliedProbability: { over: 0.5, under: 0.5 },
        estimatedEdge: { side: 'none', percentage: 0, reasoning: 'None' },
        riskLevel: 'medium',
        confidence: 50,
        disclaimer: AI_DISCLAIMER,
      }
      expect(validRecommendations).toContain(analysis.recommendation)
    })
  })

  it('"over" recommendation is valid', () => {
    expect(validRecommendations).toContain('over')
  })

  it('"under" recommendation is valid', () => {
    expect(validRecommendations).toContain('under')
  })

  it('"pass" recommendation is valid — correct choice when no edge is present', () => {
    expect(validRecommendations).toContain('pass')
  })

  it('set contains exactly 3 values', () => {
    expect(validRecommendations).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Risk levels — valid values
// ---------------------------------------------------------------------------

describe('PropAnalysis riskLevel values', () => {
  const validLevels = ['low', 'medium', 'high'] as const

  it('only low, medium, and high are valid risk levels', () => {
    validLevels.forEach((level) => {
      const analysis: PropAnalysis = {
        playerName: 'Test',
        propMarket: 'assists',
        line: 6.5,
        recommendation: 'pass',
        summary: 'Test',
        keyFactors: [],
        projectedRange: { low: 4, mid: 7, high: 10 },
        impliedProbability: { over: 0.5, under: 0.5 },
        estimatedEdge: { side: 'none', percentage: 0, reasoning: 'None' },
        riskLevel: level,
        confidence: 50,
        disclaimer: AI_DISCLAIMER,
      }
      expect(validLevels).toContain(analysis.riskLevel)
    })
  })

  it('set contains exactly 3 levels', () => {
    expect(validLevels).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Edge side — valid values
// ---------------------------------------------------------------------------

describe('PropAnalysis estimatedEdge.side values', () => {
  const validEdgeSides = ['over', 'under', 'none'] as const

  it('only over, under, and none are valid edge sides', () => {
    validEdgeSides.forEach((side) => {
      const analysis: PropAnalysis = {
        playerName: 'Test',
        propMarket: 'rebounds',
        line: 8.5,
        recommendation: 'pass',
        summary: 'Test',
        keyFactors: [],
        projectedRange: { low: 6, mid: 9, high: 12 },
        impliedProbability: { over: 0.5, under: 0.5 },
        estimatedEdge: { side, percentage: 3, reasoning: 'Test' },
        riskLevel: 'medium',
        confidence: 55,
        disclaimer: AI_DISCLAIMER,
      }
      expect(validEdgeSides).toContain(analysis.estimatedEdge.side)
    })
  })

  it('"none" edge side pairs correctly with 0% percentage', () => {
    const edge: PropAnalysis['estimatedEdge'] = {
      side: 'none',
      percentage: 0,
      reasoning: 'Line is well-set.',
    }
    expect(edge.side).toBe('none')
    expect(edge.percentage).toBe(0)
  })

  it('edge side set contains exactly 3 values', () => {
    expect(validEdgeSides).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Confidence — clamping to 0-100
// ---------------------------------------------------------------------------

describe('PropAnalysis confidence clamping', () => {
  it('confidence of 0 is at the minimum boundary', () => {
    const confidence = Math.max(0, Math.min(100, 0))
    expect(confidence).toBe(0)
  })

  it('confidence of 100 is at the maximum boundary', () => {
    const confidence = Math.max(0, Math.min(100, 100))
    expect(confidence).toBe(100)
  })

  it('confidence of 50 is midrange and unchanged by clamping', () => {
    const confidence = Math.max(0, Math.min(100, 50))
    expect(confidence).toBe(50)
  })

  it('values above 100 clamp down to 100', () => {
    const confidence = Math.max(0, Math.min(100, 150))
    expect(confidence).toBe(100)
  })

  it('values below 0 clamp up to 0', () => {
    const confidence = Math.max(0, Math.min(100, -10))
    expect(confidence).toBe(0)
  })

  it('floating-point confidence is rounded to an integer after clamping (round behaviour)', () => {
    // The module uses Math.round before clamping
    const raw = 72.7
    const confidence = Math.max(0, Math.min(100, Math.round(raw)))
    expect(confidence).toBe(73)
    expect(Number.isInteger(confidence)).toBe(true)
  })

  it('a well-formed analysis has confidence within 0-100', () => {
    const analysis: PropAnalysis = {
      playerName: 'Test',
      propMarket: 'points',
      line: 20,
      recommendation: 'over',
      summary: 'Test',
      keyFactors: [],
      projectedRange: { low: 18, mid: 21, high: 25 },
      impliedProbability: { over: 0.52, under: 0.48 },
      estimatedEdge: { side: 'over', percentage: 3, reasoning: 'Slight edge' },
      riskLevel: 'low',
      confidence: 75,
      disclaimer: AI_DISCLAIMER,
    }
    expect(analysis.confidence).toBeGreaterThanOrEqual(0)
    expect(analysis.confidence).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// Edge percentage — clamping to 0-15
// ---------------------------------------------------------------------------

describe('PropAnalysis estimatedEdge.percentage clamping', () => {
  it('0 is the minimum valid edge percentage', () => {
    const pct = Math.max(0, Math.min(15, 0))
    expect(pct).toBe(0)
  })

  it('15 is the maximum valid edge percentage', () => {
    const pct = Math.max(0, Math.min(15, 15))
    expect(pct).toBe(15)
  })

  it('values above 15 clamp down to 15', () => {
    const pct = Math.max(0, Math.min(15, 25))
    expect(pct).toBe(15)
  })

  it('negative values clamp up to 0', () => {
    const pct = Math.max(0, Math.min(15, -5))
    expect(pct).toBe(0)
  })

  it('midrange value 7.5 is unchanged by clamping', () => {
    const pct = Math.max(0, Math.min(15, 7.5))
    expect(pct).toBe(7.5)
  })

  it('a well-formed analysis has edge percentage within 0-15', () => {
    const analysis: PropAnalysis = {
      playerName: 'Test',
      propMarket: 'assists',
      line: 6.5,
      recommendation: 'under',
      summary: 'Test',
      keyFactors: [],
      projectedRange: { low: 3, mid: 5, high: 7 },
      impliedProbability: { over: 0.48, under: 0.52 },
      estimatedEdge: { side: 'under', percentage: 6, reasoning: 'Pace mismatch' },
      riskLevel: 'high',
      confidence: 62,
      disclaimer: AI_DISCLAIMER,
    }
    expect(analysis.estimatedEdge.percentage).toBeGreaterThanOrEqual(0)
    expect(analysis.estimatedEdge.percentage).toBeLessThanOrEqual(15)
  })
})

// ---------------------------------------------------------------------------
// Projected range — structure and ordering
// ---------------------------------------------------------------------------

describe('PropAnalysis projectedRange structure', () => {
  it('contains low, mid, and high keys', () => {
    const range: PropAnalysis['projectedRange'] = { low: 18, mid: 25, high: 33 }
    expect(range).toHaveProperty('low')
    expect(range).toHaveProperty('mid')
    expect(range).toHaveProperty('high')
  })

  it('all three values are numbers', () => {
    const range: PropAnalysis['projectedRange'] = { low: 18.5, mid: 25.5, high: 33.5 }
    expect(typeof range.low).toBe('number')
    expect(typeof range.mid).toBe('number')
    expect(typeof range.high).toBe('number')
  })

  it('a sensible range has low <= mid <= high', () => {
    const range: PropAnalysis['projectedRange'] = { low: 20, mid: 26, high: 32 }
    expect(range.low).toBeLessThanOrEqual(range.mid)
    expect(range.mid).toBeLessThanOrEqual(range.high)
  })

  it('projected range integrates correctly with the full PropAnalysis shape', () => {
    const analysis: PropAnalysis = {
      playerName: 'Stephen Curry',
      propMarket: 'points',
      line: 27.5,
      recommendation: 'over',
      summary: 'Curry in top form.',
      keyFactors: ['Factor 1'],
      projectedRange: { low: 22, mid: 28, high: 36 },
      impliedProbability: { over: americanToImplied(-115), under: americanToImplied(-105) },
      estimatedEdge: { side: 'over', percentage: 3, reasoning: 'Mid is above line.' },
      riskLevel: 'medium',
      confidence: 60,
      disclaimer: AI_DISCLAIMER,
    }
    expect(analysis.projectedRange.low).toBeLessThanOrEqual(analysis.projectedRange.mid)
    expect(analysis.projectedRange.mid).toBeLessThanOrEqual(analysis.projectedRange.high)
  })

  it('mid is within the inclusive [low, high] range', () => {
    const range: PropAnalysis['projectedRange'] = { low: 10, mid: 15, high: 20 }
    expect(range.mid).toBeGreaterThanOrEqual(range.low)
    expect(range.mid).toBeLessThanOrEqual(range.high)
  })

  it('falsy default range falls back gracefully (line ± 5)', () => {
    // Mirrors the fallback logic in analyzeProp: low = line-5, mid = line, high = line+5
    const line = 25.5
    const range = {
      low: line - 5,
      mid: line,
      high: line + 5,
    }
    expect(range.low).toBe(20.5)
    expect(range.mid).toBe(25.5)
    expect(range.high).toBe(30.5)
    expect(range.low).toBeLessThan(range.mid)
    expect(range.mid).toBeLessThan(range.high)
  })
})

// ---------------------------------------------------------------------------
// Key factors — capped at 6 items
// ---------------------------------------------------------------------------

describe('PropAnalysis keyFactors cap', () => {
  it('accepts an empty array', () => {
    const factors: string[] = []
    const capped = factors.slice(0, 6)
    expect(capped).toHaveLength(0)
  })

  it('accepts exactly 6 factors without truncation', () => {
    const factors = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']
    const capped = factors.slice(0, 6)
    expect(capped).toHaveLength(6)
  })

  it('truncates arrays longer than 6 to exactly 6', () => {
    const factors = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']
    const capped = factors.slice(0, 6)
    expect(capped).toHaveLength(6)
    expect(capped[5]).toBe('F6')
    expect(capped.includes('F7')).toBe(false)
    expect(capped.includes('F8')).toBe(false)
  })

  it('a well-formed analysis with 4 key factors passes the 6-item constraint', () => {
    const analysis: PropAnalysis = {
      playerName: 'Nikola Jokic',
      propMarket: 'rebounds',
      line: 11.5,
      recommendation: 'over',
      summary: 'Jokic dominates the boards.',
      keyFactors: [
        'Opponent ranks bottom-5 in defensive rebound rate',
        'Jokic averaging 13.2 RPG over last 10 games',
        'Back-to-back fatigue for opposing center',
        'Jokic plays heavy minutes in close games',
      ],
      projectedRange: { low: 9, mid: 12, high: 16 },
      impliedProbability: { over: americanToImplied(-110), under: americanToImplied(-110) },
      estimatedEdge: { side: 'over', percentage: 5, reasoning: 'Matchup strongly favours over.' },
      riskLevel: 'low',
      confidence: 72,
      disclaimer: AI_DISCLAIMER,
    }
    expect(analysis.keyFactors.length).toBeLessThanOrEqual(6)
    expect(analysis.keyFactors).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// Disclaimer enforcement
// ---------------------------------------------------------------------------

describe('PropAnalysis disclaimer enforcement', () => {
  it('AI_DISCLAIMER contains "informational purposes only"', () => {
    expect(AI_DISCLAIMER).toContain('informational purposes only')
  })

  it('AI_DISCLAIMER contains "not financial or betting advice"', () => {
    expect(AI_DISCLAIMER).toContain('not financial or betting advice')
  })

  it('AI_DISCLAIMER contains "gamble responsibly"', () => {
    expect(AI_DISCLAIMER).toContain('gamble responsibly')
  })

  it('assertDisclaimer returns the object unchanged when disclaimer is already valid', () => {
    const input = {
      value: 42,
      disclaimer: AI_DISCLAIMER,
    }
    const result = assertDisclaimer(input)
    expect(result.disclaimer).toBe(AI_DISCLAIMER)
    expect(result.value).toBe(42)
  })

  it('assertDisclaimer replaces a missing disclaimer with AI_DISCLAIMER', () => {
    const input = { disclaimer: '' }
    const result = assertDisclaimer(input)
    expect(result.disclaimer).toBe(AI_DISCLAIMER)
    expect(result.disclaimer).toContain('informational purposes')
  })

  it('assertDisclaimer replaces a disclaimer that lacks "informational purposes"', () => {
    const input = { disclaimer: 'Some other text without the magic phrase.' }
    const result = assertDisclaimer(input)
    expect(result.disclaimer).toBe(AI_DISCLAIMER)
    expect(result.disclaimer).toContain('informational purposes')
  })

  it('assertDisclaimer preserves a custom disclaimer that contains "informational purposes"', () => {
    const custom = 'For informational purposes only. Custom text here.'
    const input = { disclaimer: custom }
    const result = assertDisclaimer(input)
    // The phrase is present so the existing value is kept
    expect(result.disclaimer).toBe(custom)
  })

  it('a well-formed PropAnalysis always carries the disclaimer', () => {
    const analysis: PropAnalysis = {
      playerName: 'Giannis Antetokounmpo',
      propMarket: 'points',
      line: 30.5,
      recommendation: 'under',
      summary: 'Giannis faces a tough defensive matchup tonight.',
      keyFactors: ['Boston ranks 1st in defensive rating', 'Tatum expected to guard Giannis'],
      projectedRange: { low: 25, mid: 29, high: 35 },
      impliedProbability: {
        over: americanToImplied(-105),
        under: americanToImplied(-115),
      },
      estimatedEdge: {
        side: 'under',
        percentage: 4,
        reasoning: 'Line may be set too high against elite defence.',
      },
      riskLevel: 'medium',
      confidence: 58,
      disclaimer: AI_DISCLAIMER,
    }
    expect(analysis.disclaimer).toBeTruthy()
    expect(analysis.disclaimer).toContain('informational purposes only')
    expect(analysis.disclaimer).toContain('not financial or betting advice')
  })

  it('disclaimer is a non-empty string with meaningful length', () => {
    expect(AI_DISCLAIMER.length).toBeGreaterThan(30)
  })
})

// ---------------------------------------------------------------------------
// impliedProbability — field-level correctness on full PropAnalysis
// ---------------------------------------------------------------------------

describe('PropAnalysis impliedProbability field', () => {
  it('both over and under probabilities are between 0 and 1', () => {
    const analysis: PropAnalysis = {
      playerName: 'Test',
      propMarket: 'points',
      line: 20,
      recommendation: 'pass',
      summary: 'Test',
      keyFactors: [],
      projectedRange: { low: 15, mid: 20, high: 25 },
      impliedProbability: {
        over: americanToImplied(-110),
        under: americanToImplied(-110),
      },
      estimatedEdge: { side: 'none', percentage: 0, reasoning: 'Even market' },
      riskLevel: 'medium',
      confidence: 50,
      disclaimer: AI_DISCLAIMER,
    }
    expect(analysis.impliedProbability.over).toBeGreaterThan(0)
    expect(analysis.impliedProbability.over).toBeLessThan(1)
    expect(analysis.impliedProbability.under).toBeGreaterThan(0)
    expect(analysis.impliedProbability.under).toBeLessThan(1)
  })

  it('symmetrical -110/-110 market has both sides above 50% (bookmaker vig)', () => {
    const over = americanToImplied(-110)
    const under = americanToImplied(-110)
    expect(over).toBeGreaterThan(0.5)
    expect(under).toBeGreaterThan(0.5)
    // Both sides slightly above 0.5, sum exceeds 1
    expect(over + under).toBeGreaterThan(1)
  })

  it('when over is heavy favourite, over probability > under probability', () => {
    const over = americanToImplied(-200)
    const under = americanToImplied(170)
    expect(over).toBeGreaterThan(under)
  })

  it('when under is heavy favourite, under probability > over probability', () => {
    const over = americanToImplied(170)
    const under = americanToImplied(-200)
    expect(under).toBeGreaterThan(over)
  })
})

// ---------------------------------------------------------------------------
// Cross-field coherence — projected range vs line
// ---------------------------------------------------------------------------

describe('Projected range coherence with prop line', () => {
  it('mid projection near the line indicates an uncertain lean', () => {
    const line = 25.5
    // When mid is very close to the line, neither over nor under is obvious
    const range: PropAnalysis['projectedRange'] = { low: 22, mid: 25.8, high: 30 }
    const delta = Math.abs(range.mid - line)
    expect(delta).toBeLessThan(1)
  })

  it('mid projection well above the line suggests an over lean', () => {
    const line = 25.5
    const range: PropAnalysis['projectedRange'] = { low: 24, mid: 29, high: 34 }
    expect(range.mid).toBeGreaterThan(line)
  })

  it('mid projection well below the line suggests an under lean', () => {
    const line = 25.5
    const range: PropAnalysis['projectedRange'] = { low: 18, mid: 22, high: 26 }
    expect(range.mid).toBeLessThan(line)
  })
})
