/**
 * AI game analysis — sends matchup data to Claude and returns structured insights.
 *
 * Every analysis includes:
 *   - Summary paragraph
 *   - Key factors (array of strings)
 *   - Value assessment (which side has value, if any)
 *   - Risk level (low / medium / high)
 *   - Confidence score (0-100)
 *   - Mandatory disclaimer
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/server'
import type { NormalizedGame } from '@/lib/sports/config'
import type { Database, RiskLevel, Sport } from '@/lib/supabase/types'

type AiInsightRow = Database['public']['Tables']['ai_insights']['Row']
type AiInsightInsert = Database['public']['Tables']['ai_insights']['Insert']

export const AI_DISCLAIMER =
  'For informational purposes only. This is not financial or betting advice. Past performance does not guarantee future results. Always gamble responsibly.'

const MODEL = 'claude-sonnet-4-5-20250514'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface GameAnalysis {
  summary: string
  keyFactors: string[]
  valueAssessment: {
    side: 'home' | 'away' | 'neither'
    reasoning: string
  }
  riskLevel: RiskLevel
  confidence: number
  disclaimer: string
  fromCache: boolean
  model: string
}

// ---------------------------------------------------------------------------
// Cache layer
// ---------------------------------------------------------------------------

async function getCachedAnalysis(
  externalGameId: string
): Promise<AiInsightRow | null> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('external_game_id', externalGameId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as AiInsightRow | null
}

async function cacheAnalysis(
  externalGameId: string,
  sport: Sport,
  analysis: GameAnalysis
): Promise<void> {
  const supabase = await createServiceClient()

  const row: AiInsightInsert = {
    external_game_id: externalGameId,
    sport,
    summary: analysis.summary,
    key_factors: analysis.keyFactors,
    value_assessment: analysis.valueAssessment as unknown as Record<
      string,
      unknown
    >,
    risk_level: analysis.riskLevel,
    confidence: analysis.confidence,
    raw_analysis: analysis as unknown as Record<string, unknown>,
    model: analysis.model,
    disclaimer: AI_DISCLAIMER,
    expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  }

  const { error } = await supabase.from('ai_insights').upsert(row, {
    onConflict: 'external_game_id',
  })

  if (error) {
    console.error('[ai] Failed to cache analysis:', error.message)
  }
}

// ---------------------------------------------------------------------------
// API usage tracking
// ---------------------------------------------------------------------------

async function trackClaudeUsage(): Promise<void> {
  const supabase = await createServiceClient()
  const month = new Date().toISOString().slice(0, 7)

  const { error } = await supabase.rpc('increment_api_usage', {
    p_user_id: null,
    p_api_name: 'claude',
    p_month: month,
  })

  if (error) {
    console.error('[ai] Failed to track Claude usage:', error.message)
  }
}

// ---------------------------------------------------------------------------
// Free tier limit check
// ---------------------------------------------------------------------------

export async function checkAnalysisLimit(
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, analyses_today, analyses_reset_at')
    .eq('id', userId)
    .single()

  const profile = data as Pick<
    Database['public']['Tables']['profiles']['Row'],
    'subscription_tier' | 'analyses_today' | 'analyses_reset_at'
  > | null

  if (!profile) {
    return { allowed: false, used: 0, limit: 0 }
  }

  if (profile.subscription_tier === 'pro') {
    return { allowed: true, used: profile.analyses_today, limit: Infinity }
  }

  const limit = 3
  const now = new Date()
  const resetAt = new Date(profile.analyses_reset_at)

  // Reset counter if we've crossed midnight
  if (now > resetAt) {
    const { error: resetError } = await supabase
      .from('profiles')
      .update({
        analyses_today: 0,
        analyses_reset_at: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        ).toISOString(),
      })
      .eq('id', userId)

    if (resetError) {
      console.error('[ai] Failed to reset analysis count:', resetError.message)
    }

    return { allowed: true, used: 0, limit }
  }

  return {
    allowed: profile.analyses_today < limit,
    used: profile.analyses_today,
    limit,
  }
}

async function incrementAnalysisCount(userId: string): Promise<void> {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('profiles')
    .select('analyses_today')
    .eq('id', userId)
    .single()

  const profile = data as Pick<
    Database['public']['Tables']['profiles']['Row'],
    'analyses_today'
  > | null

  const { error } = await supabase
    .from('profiles')
    .update({ analyses_today: (profile?.analyses_today ?? 0) + 1 })
    .eq('id', userId)

  if (error) {
    console.error('[ai] Failed to increment analysis count:', error.message)
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(game: NormalizedGame): string {
  const oddsSection = game.bookmakers
    .slice(0, 5)
    .map((bk) => {
      const parts: string[] = [`  ${bk.bookmaker}:`]
      if (bk.moneyline) {
        parts.push(
          `    ML: Home ${bk.moneyline.home ?? 'N/A'} / Away ${bk.moneyline.away ?? 'N/A'}`
        )
      }
      if (bk.spread) {
        parts.push(
          `    Spread: Home ${bk.spread.homeLine ?? 'N/A'} (${bk.spread.homeOdds ?? 'N/A'}) / Away ${bk.spread.awayLine ?? 'N/A'} (${bk.spread.awayOdds ?? 'N/A'})`
        )
      }
      if (bk.total) {
        parts.push(
          `    Total: O/U ${bk.total.line ?? 'N/A'} (Over ${bk.total.overOdds ?? 'N/A'} / Under ${bk.total.underOdds ?? 'N/A'})`
        )
      }
      return parts.join('\n')
    })
    .join('\n')

  return `Analyze this upcoming ${game.sport.toUpperCase()} game and provide a structured betting analysis.

MATCHUP:
  Away: ${game.awayTeam}
  Home: ${game.homeTeam}
  Start: ${game.commenceTime}

CURRENT ODDS (${game.bookmakers.length} bookmakers):
${oddsSection}

Provide your analysis as a JSON object with exactly these fields:
{
  "summary": "2-3 sentence overview of the matchup and key storylines",
  "keyFactors": ["factor 1", "factor 2", "factor 3", "factor 4", "factor 5"],
  "valueAssessment": {
    "side": "home" | "away" | "neither",
    "reasoning": "1-2 sentences explaining where value exists based on odds vs. expected probability"
  },
  "riskLevel": "low" | "medium" | "high",
  "confidence": 0-100
}

Guidelines:
- Base analysis on the odds data provided and general knowledge of the teams
- Be honest about uncertainty — if odds are tight, confidence should be lower
- Key factors should be specific and actionable, not generic
- Value assessment should compare odds to implied probability
- Risk level should reflect how predictable the outcome is
- Do NOT recommend specific bets — only analyze value

Return ONLY the JSON object, no other text.`
}

// ---------------------------------------------------------------------------
// Core analysis function
// ---------------------------------------------------------------------------

export async function analyzeGame(
  game: NormalizedGame,
  userId: string
): Promise<GameAnalysis> {
  // Check cache first
  const cached = await getCachedAnalysis(game.id)
  if (cached) {
    return {
      summary: cached.summary,
      keyFactors: cached.key_factors as string[],
      valueAssessment: cached.value_assessment as GameAnalysis['valueAssessment'],
      riskLevel: cached.risk_level,
      confidence: cached.confidence,
      disclaimer: AI_DISCLAIMER,
      fromCache: true,
      model: cached.model,
    }
  }

  // Check free tier limit
  const limitCheck = await checkAnalysisLimit(userId)
  if (!limitCheck.allowed) {
    throw new AnalysisLimitError(limitCheck.used, limitCheck.limit)
  }

  // Call Claude
  const client = new Anthropic({ apiKey: getAnthropicApiKey() })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: buildAnalysisPrompt(game),
      },
    ],
  })

  await trackClaudeUsage()
  await incrementAnalysisCount(userId)

  // Parse response
  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let parsed: {
    summary: string
    keyFactors: string[]
    valueAssessment: { side: 'home' | 'away' | 'neither'; reasoning: string }
    riskLevel: string
    confidence: number
  }

  try {
    // Strip markdown code fences if present
    const jsonStr = textContent.text
      .replace(/^```json?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[ai] Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse AI analysis response')
  }

  // Validate and normalize
  const validRiskLevels: RiskLevel[] = ['low', 'medium', 'high']
  const riskLevel: RiskLevel = validRiskLevels.includes(
    parsed.riskLevel as RiskLevel
  )
    ? (parsed.riskLevel as RiskLevel)
    : 'medium'

  const confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)))

  const analysis: GameAnalysis = {
    summary: parsed.summary,
    keyFactors: Array.isArray(parsed.keyFactors)
      ? parsed.keyFactors.slice(0, 7)
      : [],
    valueAssessment: {
      side: ['home', 'away', 'neither'].includes(parsed.valueAssessment?.side)
        ? parsed.valueAssessment.side
        : 'neither',
      reasoning: parsed.valueAssessment?.reasoning ?? 'Unable to determine value.',
    },
    riskLevel,
    confidence,
    disclaimer: AI_DISCLAIMER,
    fromCache: false,
    model: MODEL,
  }

  // Cache the result
  await cacheAnalysis(game.id, game.sport, analysis)

  return analysis
}

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------

export class AnalysisLimitError extends Error {
  constructor(
    public used: number,
    public limit: number
  ) {
    super(
      `Daily analysis limit reached (${used}/${limit}). Upgrade to Pro for unlimited analyses.`
    )
    this.name = 'AnalysisLimitError'
  }
}
