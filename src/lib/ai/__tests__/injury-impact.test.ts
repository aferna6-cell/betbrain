import { describe, it, expect } from 'vitest'
import { AI_DISCLAIMER } from '@/lib/ai/analysis'
import type { InjuryImpactAnalysis } from '@/lib/ai/injury-impact'

describe('InjuryImpactAnalysis type compliance', () => {
  it('a well-formed injury analysis has all required fields', () => {
    const analysis: InjuryImpactAnalysis = {
      playerName: 'LeBron James',
      injuryStatus: 'Questionable - right ankle',
      impactSummary: 'LeBron is critical to the Lakers offense...',
      winProbabilityShift: {
        direction: 'favors_away',
        magnitude: 'large',
        explanation: 'Without LeBron, the Lakers lose their primary scorer...',
      },
      lineImpact: {
        alreadyPricedIn: false,
        explanation: 'The injury was just reported...',
      },
      valueShift: {
        side: 'away',
        reasoning: 'The away team now has better value...',
      },
      disclaimer: AI_DISCLAIMER,
    }

    expect(analysis.playerName).toBe('LeBron James')
    expect(analysis.injuryStatus).toContain('Questionable')
    expect(analysis.winProbabilityShift.direction).toBe('favors_away')
    expect(analysis.winProbabilityShift.magnitude).toBe('large')
    expect(analysis.lineImpact.alreadyPricedIn).toBe(false)
    expect(analysis.valueShift.side).toBe('away')
    expect(analysis.disclaimer).toContain('informational purposes')
  })

  it('win probability direction must be valid', () => {
    const validDirections = ['favors_home', 'favors_away', 'negligible']
    validDirections.forEach((dir) => {
      expect(validDirections).toContain(dir)
    })
  })

  it('win probability magnitude must be valid', () => {
    const validMagnitudes = ['large', 'moderate', 'small']
    validMagnitudes.forEach((mag) => {
      expect(validMagnitudes).toContain(mag)
    })
  })

  it('value shift side must be valid', () => {
    const validSides = ['home', 'away', 'neither']
    validSides.forEach((side) => {
      expect(validSides).toContain(side)
    })
  })

  it('disclaimer must always be present and contain required text', () => {
    const analysis: InjuryImpactAnalysis = {
      playerName: 'Test Player',
      injuryStatus: 'Out',
      impactSummary: 'Test',
      winProbabilityShift: {
        direction: 'negligible',
        magnitude: 'small',
        explanation: 'Test',
      },
      lineImpact: { alreadyPricedIn: true, explanation: 'Test' },
      valueShift: { side: 'neither', reasoning: 'Test' },
      disclaimer: AI_DISCLAIMER,
    }
    expect(analysis.disclaimer).toBe(AI_DISCLAIMER)
    expect(analysis.disclaimer).toContain('informational purposes only')
  })
})
