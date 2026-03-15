import { describe, it, expect } from 'vitest'
import { AI_DISCLAIMER, AnalysisLimitError } from '@/lib/ai/analysis'
import type { GameAnalysis } from '@/lib/ai/analysis'

describe('AI Disclaimer', () => {
  it('contains required legal text', () => {
    expect(AI_DISCLAIMER).toContain('informational purposes only')
    expect(AI_DISCLAIMER).toContain('not financial or betting advice')
    expect(AI_DISCLAIMER).toContain('gamble responsibly')
  })

  it('is non-empty', () => {
    expect(AI_DISCLAIMER.length).toBeGreaterThan(20)
  })
})

describe('GameAnalysis type compliance', () => {
  it('a well-formed analysis has all required fields', () => {
    const analysis: GameAnalysis = {
      summary: 'Test summary of the matchup',
      keyFactors: ['Factor 1', 'Factor 2', 'Factor 3'],
      valueAssessment: {
        side: 'home',
        reasoning: 'Home team has value because...',
      },
      riskLevel: 'medium',
      confidence: 72,
      disclaimer: AI_DISCLAIMER,
      fromCache: false,
      model: 'claude-sonnet-4-5-20250514',
    }

    expect(analysis.summary).toBeTruthy()
    expect(analysis.keyFactors).toHaveLength(3)
    expect(analysis.valueAssessment.side).toBe('home')
    expect(analysis.riskLevel).toMatch(/^(low|medium|high)$/)
    expect(analysis.confidence).toBeGreaterThanOrEqual(0)
    expect(analysis.confidence).toBeLessThanOrEqual(100)
    expect(analysis.disclaimer).toContain('informational purposes')
  })

  it('value assessment side must be home, away, or neither', () => {
    const validSides = ['home', 'away', 'neither'] as const
    validSides.forEach((side) => {
      const analysis: GameAnalysis = {
        summary: 'Test',
        keyFactors: [],
        valueAssessment: { side, reasoning: 'Test' },
        riskLevel: 'low',
        confidence: 50,
        disclaimer: AI_DISCLAIMER,
        fromCache: false,
        model: 'test',
      }
      expect(['home', 'away', 'neither']).toContain(analysis.valueAssessment.side)
    })
  })

  it('risk level must be low, medium, or high', () => {
    const validLevels = ['low', 'medium', 'high'] as const
    validLevels.forEach((level) => {
      expect(['low', 'medium', 'high']).toContain(level)
    })
  })
})

describe('AnalysisLimitError', () => {
  it('has correct name', () => {
    const error = new AnalysisLimitError(3, 3)
    expect(error.name).toBe('AnalysisLimitError')
  })

  it('includes usage counts in message', () => {
    const error = new AnalysisLimitError(3, 3)
    expect(error.message).toContain('3/3')
    expect(error.message).toContain('Upgrade to Pro')
  })

  it('exposes used and limit properties', () => {
    const error = new AnalysisLimitError(2, 5)
    expect(error.used).toBe(2)
    expect(error.limit).toBe(5)
  })

  it('is an instance of Error', () => {
    const error = new AnalysisLimitError(1, 3)
    expect(error).toBeInstanceOf(Error)
  })
})
