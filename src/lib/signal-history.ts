import { createServiceClient } from '@/lib/supabase/server'
import type { SmartSignal } from '@/lib/signals'
import type { Sport, PickOutcome } from '@/lib/supabase/types'

export interface SignalHistoryRecord {
  id: string
  external_game_id: string
  sport: Sport
  home_team: string
  away_team: string
  game_date: string
  strength: 'strong' | 'moderate'
  signal_count: number
  signals: string[]
  value_side: 'home' | 'away' | null
  ai_confidence: number | null
  outcome: PickOutcome | null
  resolved_at: string | null
  detected_at: string
}

export interface SignalStats {
  total: number
  resolved: number
  pending: number
  wins: number
  losses: number
  pushes: number
  hitRate: number | null
  byStrength: {
    strong: { total: number; wins: number; hitRate: number | null }
    moderate: { total: number; wins: number; hitRate: number | null }
  }
  bySport: Record<Sport, { total: number; wins: number; hitRate: number | null }>
}

/**
 * Persist detected Smart Signals to signal_history for outcome tracking.
 * Uses upsert to avoid duplicates — only one record per game.
 */
export async function persistSignals(signals: SmartSignal[]): Promise<void> {
  if (signals.length === 0) return

  const supabase = await createServiceClient()

  const rows = signals.map((s) => ({
    external_game_id: s.game.id,
    sport: s.game.sport,
    home_team: s.game.homeTeam,
    away_team: s.game.awayTeam,
    game_date: s.game.commenceTime,
    strength: s.strength,
    signal_count: s.signals.length,
    signals: s.signals,
    value_side: s.bestValue.side,
    ai_confidence: s.aiConfidence,
  }))

  const { error } = await supabase
    .from('signal_history')
    .upsert(rows, { onConflict: 'external_game_id', ignoreDuplicates: false })

  if (error) {
    console.error('[signal-history] Failed to persist signals:', error.message)
  }
}

/**
 * Fetch signal history records, optionally filtered by sport or outcome.
 */
export async function getSignalHistory(filters?: {
  sport?: Sport
  outcome?: PickOutcome | 'pending'
  limit?: number
}): Promise<SignalHistoryRecord[]> {
  const supabase = await createServiceClient()

  let query = supabase
    .from('signal_history')
    .select('*')
    .order('detected_at', { ascending: false })

  if (filters?.sport) {
    query = query.eq('sport', filters.sport)
  }
  if (filters?.outcome === 'pending') {
    query = query.is('outcome', null)
  } else if (filters?.outcome) {
    query = query.eq('outcome', filters.outcome)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[signal-history] Failed to fetch history:', error.message)
    return []
  }

  return (data ?? []) as SignalHistoryRecord[]
}

/**
 * Resolve a signal's outcome (win/loss/push).
 * "Win" means the value_side team covered/won.
 */
export async function resolveSignal(
  externalGameId: string,
  outcome: 'win' | 'loss' | 'push'
): Promise<boolean> {
  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('signal_history')
    .update({
      outcome,
      resolved_at: new Date().toISOString(),
    })
    .eq('external_game_id', externalGameId)

  if (error) {
    console.error('[signal-history] Failed to resolve signal:', error.message)
    return false
  }

  return true
}

function calcHitRate(wins: number, total: number): number | null {
  if (total === 0) return null
  return Math.round((wins / total) * 1000) / 10
}

/**
 * Calculate aggregate signal performance stats.
 */
export async function getSignalStats(): Promise<SignalStats> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('signal_history')
    .select('strength, sport, outcome')

  if (error || !data) {
    console.error('[signal-history] Failed to fetch stats:', error?.message)
    return emptyStats()
  }

  const records = data as { strength: string; sport: Sport; outcome: string | null }[]

  const total = records.length
  const resolved = records.filter((r) => r.outcome && r.outcome !== 'pending')
  const wins = resolved.filter((r) => r.outcome === 'win')
  const losses = resolved.filter((r) => r.outcome === 'loss')
  const pushes = resolved.filter((r) => r.outcome === 'push')

  const strongRecords = resolved.filter((r) => r.strength === 'strong')
  const strongWins = strongRecords.filter((r) => r.outcome === 'win')
  const moderateRecords = resolved.filter((r) => r.strength === 'moderate')
  const moderateWins = moderateRecords.filter((r) => r.outcome === 'win')

  const sports: Sport[] = ['nba', 'nfl', 'mlb', 'nhl']
  const bySport = {} as Record<Sport, { total: number; wins: number; hitRate: number | null }>
  for (const sport of sports) {
    const sportResolved = resolved.filter((r) => r.sport === sport)
    const sportWins = sportResolved.filter((r) => r.outcome === 'win')
    bySport[sport] = {
      total: sportResolved.length,
      wins: sportWins.length,
      hitRate: calcHitRate(sportWins.length, sportResolved.length),
    }
  }

  return {
    total,
    resolved: resolved.length,
    pending: total - resolved.length,
    wins: wins.length,
    losses: losses.length,
    pushes: pushes.length,
    hitRate: calcHitRate(wins.length, resolved.length),
    byStrength: {
      strong: {
        total: strongRecords.length,
        wins: strongWins.length,
        hitRate: calcHitRate(strongWins.length, strongRecords.length),
      },
      moderate: {
        total: moderateRecords.length,
        wins: moderateWins.length,
        hitRate: calcHitRate(moderateWins.length, moderateRecords.length),
      },
    },
    bySport,
  }
}

function emptyStats(): SignalStats {
  return {
    total: 0,
    resolved: 0,
    pending: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    hitRate: null,
    byStrength: {
      strong: { total: 0, wins: 0, hitRate: null },
      moderate: { total: 0, wins: 0, hitRate: null },
    },
    bySport: {
      nba: { total: 0, wins: 0, hitRate: null },
      nfl: { total: 0, wins: 0, hitRate: null },
      mlb: { total: 0, wins: 0, hitRate: null },
      nhl: { total: 0, wins: 0, hitRate: null },
    },
  }
}
