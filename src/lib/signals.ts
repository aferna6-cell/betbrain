import type { NormalizedGame, NormalizedBookmakerOdds } from '@/lib/sports/config'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type AiInsightRow = Database['public']['Tables']['ai_insights']['Row']

export interface SmartSignal {
  game: NormalizedGame
  signals: string[]
  strength: 'strong' | 'moderate'
  aiConfidence: number | null
  bestValue: {
    side: 'home' | 'away' | null
    reasoning: string | null
  }
}

const MIN_BOOKMAKERS_FOR_SIGNAL = 3
const MONEYLINE_VARIANCE_THRESHOLD = 30 // >30 point spread between best/worst odds
const AI_CONFIDENCE_THRESHOLD = 75

/**
 * Detects Smart Signals: games where multiple indicators align for potential value.
 *
 * Signal types:
 * 1. Odds variance — significant disagreement between bookmakers
 * 2. High AI confidence — cached analysis shows confidence >= 75
 * 3. Clear value side — AI identified a value side with high confidence
 */
export async function detectSmartSignals(
  games: NormalizedGame[]
): Promise<SmartSignal[]> {
  const supabase = await createServiceClient()

  // Batch fetch cached AI insights for all games
  const gameIds = games.map((g) => g.id)
  const { data: insightsData } = await supabase
    .from('ai_insights')
    .select('external_game_id, confidence, value_assessment, risk_level')
    .in('external_game_id', gameIds)
    .gt('expires_at', new Date().toISOString())

  const insights = new Map<string, AiInsightRow>()
  if (insightsData) {
    for (const row of insightsData as AiInsightRow[]) {
      insights.set(row.external_game_id, row)
    }
  }

  const signals: SmartSignal[] = []

  for (const game of games) {
    if (game.bookmakers.length < MIN_BOOKMAKERS_FOR_SIGNAL) continue

    const gameSignals: string[] = []
    const insight = insights.get(game.id)

    // Signal 1: Moneyline odds variance
    const mlVariance = getMoneylineVariance(game.bookmakers)
    if (mlVariance.home > MONEYLINE_VARIANCE_THRESHOLD) {
      gameSignals.push(
        `Home moneyline varies by ${mlVariance.home} pts across books — line shopping opportunity`
      )
    }
    if (mlVariance.away > MONEYLINE_VARIANCE_THRESHOLD) {
      gameSignals.push(
        `Away moneyline varies by ${mlVariance.away} pts across books — line shopping opportunity`
      )
    }

    // Signal 2: High AI confidence
    const aiConfidence = insight?.confidence ?? null
    if (aiConfidence !== null && aiConfidence >= AI_CONFIDENCE_THRESHOLD) {
      gameSignals.push(
        `AI analysis confidence: ${aiConfidence}% — above threshold`
      )
    }

    // Signal 3: AI value assessment + low risk
    const valueAssessment = insight?.value_assessment as {
      side?: string
      reasoning?: string
    } | null
    if (
      valueAssessment?.side &&
      valueAssessment.side !== 'neither' &&
      insight?.risk_level !== 'high'
    ) {
      gameSignals.push(
        `AI identifies value on ${valueAssessment.side} side`
      )
    }

    if (gameSignals.length >= 2) {
      signals.push({
        game,
        signals: gameSignals,
        strength: gameSignals.length >= 3 ? 'strong' : 'moderate',
        aiConfidence,
        bestValue: {
          side:
            valueAssessment?.side === 'home' || valueAssessment?.side === 'away'
              ? valueAssessment.side
              : null,
          reasoning: valueAssessment?.reasoning ?? null,
        },
      })
    }
  }

  // Sort by number of signals (strongest first)
  return signals.sort((a, b) => b.signals.length - a.signals.length)
}

function getMoneylineVariance(bookmakers: NormalizedBookmakerOdds[]): {
  home: number
  away: number
} {
  const homePrices: number[] = []
  const awayPrices: number[] = []

  for (const bk of bookmakers) {
    if (bk.moneyline?.home !== null && bk.moneyline?.home !== undefined) {
      homePrices.push(bk.moneyline.home)
    }
    if (bk.moneyline?.away !== null && bk.moneyline?.away !== undefined) {
      awayPrices.push(bk.moneyline.away)
    }
  }

  return {
    home:
      homePrices.length >= 2
        ? Math.max(...homePrices) - Math.min(...homePrices)
        : 0,
    away:
      awayPrices.length >= 2
        ? Math.max(...awayPrices) - Math.min(...awayPrices)
        : 0,
  }
}
