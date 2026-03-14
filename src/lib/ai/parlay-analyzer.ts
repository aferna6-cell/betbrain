/**
 * Parlay analyzer — uses Claude to assess a multi-leg parlay's combined
 * probability versus payout odds. Flags +EV parlays.
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey } from '@/lib/env'
import { AI_DISCLAIMER } from '@/lib/ai/analysis'

const MODEL = 'claude-sonnet-4-5-20250514'

export interface ParlayLeg {
  description: string // e.g. "Lakers ML", "LeBron O25.5 pts"
  odds: number // American odds, e.g. -150
  sport: string
}

export interface ParlayAnalysis {
  legs: ParlayLeg[]
  combinedOdds: number
  impliedProbability: number
  payoutMultiplier: number
  assessment: {
    isPositiveEV: boolean
    estimatedTrueProbability: number
    expectedValue: number // cents per dollar wagered
    reasoning: string
  }
  legAnalyses: Array<{
    description: string
    confidence: number
    risk: 'low' | 'medium' | 'high'
    note: string
  }>
  correlationWarnings: string[]
  recommendation: 'bet' | 'pass' | 'reduce'
  summary: string
  disclaimer: string
}

function americanToDecimal(odds: number): number {
  if (odds > 0) return odds / 100 + 1
  return 100 / Math.abs(odds) + 1
}

function americanToImplied(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

function buildParlayPrompt(legs: ParlayLeg[]): string {
  const legDetails = legs
    .map((leg, i) => {
      const implied = (americanToImplied(leg.odds) * 100).toFixed(1)
      const oddsStr = leg.odds > 0 ? `+${leg.odds}` : `${leg.odds}`
      return `  Leg ${i + 1}: ${leg.description} (${leg.sport.toUpperCase()}) — ${oddsStr} (implied ${implied}%)`
    })
    .join('\n')

  const combinedDecimal = legs.reduce(
    (acc, leg) => acc * americanToDecimal(leg.odds),
    1
  )
  const combinedImplied = legs.reduce(
    (acc, leg) => acc * americanToImplied(leg.odds),
    1
  )
  const combinedAmerican = decimalToAmerican(combinedDecimal)

  return `Analyze this ${legs.length}-leg parlay and assess its value.

PARLAY LEGS:
${legDetails}

COMBINED ODDS: ${combinedAmerican > 0 ? '+' : ''}${combinedAmerican} (${combinedDecimal.toFixed(2)}x payout)
NAIVE IMPLIED PROBABILITY: ${(combinedImplied * 100).toFixed(2)}%

Provide your analysis as a JSON object with exactly these fields:
{
  "estimatedTrueProbability": <number 0-100 - your best estimate of actual probability>,
  "legAnalyses": [
    {
      "description": "${legs[0]?.description ?? ''}",
      "confidence": <0-100>,
      "risk": "low" | "medium" | "high",
      "note": "1 sentence on this leg"
    }
    // ... one per leg
  ],
  "correlationWarnings": ["warning about correlated legs, if any"],
  "recommendation": "bet" | "pass" | "reduce",
  "summary": "2-3 sentence overall assessment"
}

Guidelines:
- Parlay probability is NOT just the product of individual probs (correlation matters)
- If legs are from the same game, warn about correlation
- Consider that books build in significant vig on parlays — true edge is rare
- "reduce" means the parlay has some value but would be better with fewer legs
- Be conservative — most parlays are -EV by design
- Assess each leg independently, then the combination

Return ONLY the JSON object, no other text.`
}

export async function analyzeParlay(legs: ParlayLeg[]): Promise<ParlayAnalysis> {
  if (legs.length < 2) {
    throw new Error('A parlay requires at least 2 legs')
  }
  if (legs.length > 10) {
    throw new Error('Maximum 10 legs per parlay')
  }

  const client = new Anthropic({ apiKey: getAnthropicApiKey() })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: buildParlayPrompt(legs),
      },
    ],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let parsed: {
    estimatedTrueProbability: number
    legAnalyses: Array<{
      description: string
      confidence: number
      risk: string
      note: string
    }>
    correlationWarnings: string[]
    recommendation: string
    summary: string
  }

  try {
    const jsonStr = textContent.text
      .replace(/^```json?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[ai] Failed to parse parlay analysis:', textContent.text)
    throw new Error('Failed to parse parlay analysis response')
  }

  // Calculate combined odds
  const combinedDecimal = legs.reduce(
    (acc, leg) => acc * americanToDecimal(leg.odds),
    1
  )
  const combinedAmerican = decimalToAmerican(combinedDecimal)
  const impliedProbability = legs.reduce(
    (acc, leg) => acc * americanToImplied(leg.odds),
    1
  )

  const trueProbEstimate = Math.max(
    0.1,
    Math.min(99.9, parsed.estimatedTrueProbability ?? impliedProbability * 100)
  )
  const expectedValue =
    (trueProbEstimate / 100) * (combinedDecimal - 1) -
    (1 - trueProbEstimate / 100)

  const validRecs = ['bet', 'pass', 'reduce'] as const
  const validRisks = ['low', 'medium', 'high'] as const

  return assertDisclaimer({
    legs,
    combinedOdds: combinedAmerican,
    impliedProbability,
    payoutMultiplier: combinedDecimal,
    assessment: {
      isPositiveEV: expectedValue > 0,
      estimatedTrueProbability: trueProbEstimate,
      expectedValue: Math.round(expectedValue * 100) / 100,
      reasoning: parsed.summary ?? 'Unable to assess.',
    },
    legAnalyses: (parsed.legAnalyses ?? []).map((la, i) => ({
      description: la.description ?? legs[i]?.description ?? `Leg ${i + 1}`,
      confidence: Math.max(0, Math.min(100, Math.round(la.confidence ?? 50))),
      risk: validRisks.includes(la.risk as typeof validRisks[number])
        ? (la.risk as typeof validRisks[number])
        : 'medium',
      note: la.note ?? '',
    })),
    correlationWarnings: Array.isArray(parsed.correlationWarnings)
      ? parsed.correlationWarnings
      : [],
    recommendation: validRecs.includes(
      parsed.recommendation as typeof validRecs[number]
    )
      ? (parsed.recommendation as typeof validRecs[number])
      : 'pass',
    summary: parsed.summary ?? 'Unable to assess this parlay.',
    disclaimer: AI_DISCLAIMER,
  })
}

function assertDisclaimer<T extends { disclaimer: string }>(analysis: T): T {
  if (
    !analysis.disclaimer ||
    !analysis.disclaimer.includes('informational purposes')
  ) {
    analysis.disclaimer = AI_DISCLAIMER
  }
  return analysis
}
