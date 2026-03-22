import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  resolvePicksBatch,
  normalizeTeamName,
  resolveSignalOutcome,
  nbaGameToResult,
  type PendingPick,
  type GameResult,
} from '@/lib/auto-resolve'
import { getNBAGames } from '@/lib/sports/stats'
import type { SignalHistoryRecord } from '@/lib/signal-history'
import type { PickOutcome } from '@/lib/supabase/types'

/**
 * GET /api/cron/resolve
 *
 * Vercel Cron-compatible endpoint that auto-resolves ALL pending NBA picks
 * and Smart Signals for all users. Secured by CRON_SECRET header.
 *
 * Designed to run daily at ~10am ET (after previous night's games are final).
 *
 * To configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/resolve", "schedule": "0 14 * * *" }] }
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()

    // Fetch ALL pending NBA picks across all users
    const { data: pendingPicks, error: picksError } = await supabase
      .from('user_picks')
      .select('id, external_game_id, sport, pick_type, pick_team, pick_line, odds, units, game_date')
      .eq('sport', 'nba')
      .is('outcome', null)
      .lt('game_date', new Date().toISOString())
      .limit(500)

    // Fetch pending signals
    const { data: pendingSignals } = await supabase
      .from('signal_history')
      .select('*')
      .eq('sport', 'nba')
      .is('outcome', null)
      .lt('game_date', new Date().toISOString())
      .limit(500)

    if (picksError) {
      console.error('[cron/resolve] Failed to fetch picks:', picksError.message)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    const totalPending = (pendingPicks?.length ?? 0) + (pendingSignals?.length ?? 0)
    if (totalPending === 0) {
      return NextResponse.json({ message: 'Nothing to resolve', picks: 0, signals: 0 })
    }

    // Collect unique game dates
    const allDates = new Set<string>()
    for (const p of pendingPicks ?? []) allDates.add(p.game_date.split('T')[0])
    for (const s of (pendingSignals ?? []) as SignalHistoryRecord[]) allDates.add(s.game_date.split('T')[0])

    // Fetch NBA game results
    const allGames: GameResult[] = []
    for (const date of allDates) {
      const result = await getNBAGames({ dates: [date] })
      if (result.data) {
        for (const g of result.data) {
          allGames.push(nbaGameToResult(g))
        }
      }
    }

    // Resolve picks (parallel updates for performance)
    const resolvedAt = new Date().toISOString()
    let picksResolved = 0
    if (pendingPicks && pendingPicks.length > 0 && allGames.length > 0) {
      const { resolved } = resolvePicksBatch(pendingPicks as PendingPick[], allGames)

      const pickResults = await Promise.allSettled(
        resolved.map((r) =>
          supabase
            .from('user_picks')
            .update({
              outcome: r.outcome,
              profit: r.profit,
              resolved_at: resolvedAt,
            })
            .eq('id', r.pickId)
        )
      )
      picksResolved = pickResults.filter(
        (r) => r.status === 'fulfilled' && !r.value.error
      ).length
    }

    // Resolve signals (parallel updates for performance)
    let signalsResolved = 0
    if (pendingSignals && pendingSignals.length > 0) {
      const signalUpdates: { id: string; outcome: PickOutcome }[] = []
      for (const signal of pendingSignals as SignalHistoryRecord[]) {
        const signalDate = signal.game_date.split('T')[0]
        const game = allGames.find((g) => {
          if (g.status !== 'Final') return false
          if (g.date.split('T')[0] !== signalDate) return false
          return (
            normalizeTeamName(g.homeTeam) === normalizeTeamName(signal.home_team) &&
            normalizeTeamName(g.awayTeam) === normalizeTeamName(signal.away_team)
          )
        })

        if (!game || !signal.value_side) continue

        const outcome = resolveSignalOutcome(signal.value_side, game)
        signalUpdates.push({ id: signal.id, outcome })
      }

      const signalResults = await Promise.allSettled(
        signalUpdates.map((s) =>
          supabase
            .from('signal_history')
            .update({ outcome: s.outcome, resolved_at: resolvedAt })
            .eq('id', s.id)
        )
      )
      signalsResolved = signalResults.filter(
        (r) => r.status === 'fulfilled' && !r.value.error
      ).length
    }

    console.log(`[cron/resolve] Resolved ${picksResolved} picks + ${signalsResolved} signals`)

    return NextResponse.json({
      message: `Resolved ${picksResolved} picks and ${signalsResolved} signals`,
      picks: picksResolved,
      signals: signalsResolved,
    })
  } catch (err) {
    console.error('[cron/resolve] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal error during resolution' },
      { status: 500 }
    )
  }
}
