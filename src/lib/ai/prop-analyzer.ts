/**
 * Prop bet analyzer — uses Claude to assess whether a player prop bet
 * offers value given the matchup context, usage patterns, and current odds.
 *
 * Results are cached in prop_analysis_cache so re-viewing the same prop
 * does not consume the user's daily analysis limit.
 *
 * Example: "Is LeBron Over 25.5 points a good bet?"
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey } from '@/lib/env'
import { AI_DISCLAIMER } from '@/lib/ai/analysis'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database, Sport } from '@/lib/supabase/types'

const MODEL = 'claude-sonnet-4-6'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

type PropCacheRow = Database['public']['Tables']['prop_analysis_cache']['Row']
type PropCacheInsert = Database['public']['Tables']['prop_analysis_cache']['Insert']

export interface PropAnalysisInput {
  playerName: string
  sport: string
  team: string
  opponent: string
  propMarket: string // e.g. "points", "rebounds", "assists", "passing_yards"
  line: number // e.g. 25.5
  overOdds: number // e.g. -110
  underOdds: number // e.g. -110
}

export interface PropAnalysis {
  playerName: string
  propMarket: string
  line: number
  recommendation: 'over' | 'under' | 'pass'
  summary: string
  keyFactors: string[]
  projectedRange: {
    low: number
    mid: number
    high: number
  }
  impliedProbability: {
    over: number
    under: number
  }
  estimatedEdge: {
    side: 'over' | 'under' | 'none'
    percentage: number
    reasoning: string
  }
  riskLevel: 'low' | 'medium' | 'high'
  confidence: number
  disclaimer: string
  fromCache: boolean
}

function americanToImplied(odds: number): number {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

// ---------------------------------------------------------------------------
// Cache layer
// ---------------------------------------------------------------------------

function normalizeString(s: string): string {
  return s.trim().toLowerCase()
}

export async function getCachedPropAnalysis(
  userId: string,
  input: PropAnalysisInput
): Promise<PropAnalysis | null> {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('prop_analysis_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('player_name', normalizeString(input.playerName))
    .eq('sport', normalizeString(input.sport) as Sport)
    .eq('team', normalizeString(input.team))
    .eq('opponent', normalizeString(input.opponent))
    .eq('prop_market', normalizeString(input.propMarket))
    .eq('line', input.line)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const row = data as PropCacheRow
  const result = row.result as unknown as PropAnalysis

  return {
    ...result,
    fromCache: true,
    disclaimer: AI_DISCLAIMER,
  }
}

async function cachePropAnalysis(
  userId: string,
  input: PropAnalysisInput,
  analysis: PropAnalysis
): Promise<void> {
  const supabase = await createServiceClient()

  const row: PropCacheInsert = {
    user_id: userId,
    player_name: normalizeString(input.playerName),
    sport: normalizeString(input.sport) as Sport,
    team: normalizeString(input.team),
    opponent: normalizeString(input.opponent),
    prop_market: normalizeString(input.propMarket),
    line: input.line,
    over_odds: input.overOdds,
    under_odds: input.underOdds,
    result: analysis as unknown as Record<string, unknown>,
    model: MODEL,
    expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  }

  const { error } = await supabase
    .from('prop_analysis_cache')
    .upsert(row, {
      onConflict: 'user_id,player_name,sport,team,opponent,prop_market,line',
    })

  if (error) {
    console.error('[ai] Failed to cache prop analysis:', error.message)
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildPropPrompt(input: PropAnalysisInput): string {
  const impliedOver = (americanToImplied(input.overOdds) * 100).toFixed(1)
  const impliedUnder = (americanToImplied(input.underOdds) * 100).toFixed(1)

  return `Analyze this player prop bet and provide a structured assessment.

PROP BET:
  Player: ${input.playerName}
  Team: ${input.team}
  Opponent: ${input.opponent}
  Sport: ${input.sport.toUpperCase()}
  Market: ${input.propMarket}
  Line: ${input.line}
  Over odds: ${input.overOdds > 0 ? '+' : ''}${input.overOdds} (implied ${impliedOver}%)
  Under odds: ${input.underOdds > 0 ? '+' : ''}${input.underOdds} (implied ${impliedUnder}%)

Provide your analysis as a JSON object with exactly these fields:
{
  "recommendation": "over" | "under" | "pass",
  "summary": "2-3 sentence assessment of this prop",
  "keyFactors": ["factor 1", "factor 2", "factor 3", "factor 4"],
  "projectedRange": {
    "low": <number - realistic floor>,
    "mid": <number - most likely outcome>,
    "high": <number - realistic ceiling>
  },
  "estimatedEdge": {
    "side": "over" | "under" | "none",
    "percentage": <0-15 - estimated edge percentage>,
    "reasoning": "1-2 sentences on why edge exists or doesn't"
  },
  "riskLevel": "low" | "medium" | "high",
  "confidence": 0-100
}

Guidelines:
- Consider the player's role, recent form, matchup difficulty, pace, and minutes
- Compare your projected range to the prop line
- If the line is well-set and no clear edge exists, recommend "pass"
- Be honest about uncertainty — player props are inherently volatile
- Factor in the specific opponent's defensive tendencies
- Key factors should be specific to THIS matchup, not generic

Return ONLY the JSON object, no other text.`
}

// ---------------------------------------------------------------------------
// Core analysis function
// ---------------------------------------------------------------------------

export async function analyzeProp(
  input: PropAnalysisInput
): Promise<PropAnalysis> {
  const client = new Anthropic({ apiKey: getAnthropicApiKey() })

  let message: Anthropic.Message
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildPropPrompt(input),
        },
      ],
    })
  } catch (err) {
    console.error('[ai] Claude API error in prop analysis:', err)
    throw new Error('AI analysis service is temporarily unavailable. Please try again.')
  }

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let parsed: {
    recommendation: string
    summary: string
    keyFactors: string[]
    projectedRange: { low: number; mid: number; high: number }
    estimatedEdge: { side: string; percentage: number; reasoning: string }
    riskLevel: string
    confidence: number
  }

  try {
    const jsonStr = textContent.text
      .replace(/^```json?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[ai] Failed to parse prop analysis:', textContent.text)
    throw new Error('Failed to parse prop analysis response')
  }

  const validRecs = ['over', 'under', 'pass'] as const
  const validRisks = ['low', 'medium', 'high'] as const
  const validEdgeSides = ['over', 'under', 'none'] as const

  return assertDisclaimer({
    playerName: input.playerName,
    propMarket: input.propMarket,
    line: input.line,
    recommendation: validRecs.includes(parsed.recommendation as typeof validRecs[number])
      ? (parsed.recommendation as typeof validRecs[number])
      : 'pass',
    summary: parsed.summary ?? 'Unable to assess this prop.',
    keyFactors: Array.isArray(parsed.keyFactors)
      ? parsed.keyFactors.slice(0, 6)
      : [],
    projectedRange: {
      low: parsed.projectedRange?.low ?? input.line - 5,
      mid: parsed.projectedRange?.mid ?? input.line,
      high: parsed.projectedRange?.high ?? input.line + 5,
    },
    impliedProbability: {
      over: americanToImplied(input.overOdds),
      under: americanToImplied(input.underOdds),
    },
    estimatedEdge: {
      side: validEdgeSides.includes(
        parsed.estimatedEdge?.side as typeof validEdgeSides[number]
      )
        ? (parsed.estimatedEdge.side as typeof validEdgeSides[number])
        : 'none',
      percentage: Math.max(
        0,
        Math.min(15, parsed.estimatedEdge?.percentage ?? 0)
      ),
      reasoning: parsed.estimatedEdge?.reasoning ?? 'Unable to determine edge.',
    },
    riskLevel: validRisks.includes(parsed.riskLevel as typeof validRisks[number])
      ? (parsed.riskLevel as typeof validRisks[number])
      : 'medium',
    confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence ?? 50))),
    disclaimer: AI_DISCLAIMER,
    fromCache: false,
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

export { cachePropAnalysis }
