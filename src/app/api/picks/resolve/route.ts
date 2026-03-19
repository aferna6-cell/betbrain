import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { createServiceClient } from '@/lib/supabase/server'
import {
  resolvePicksBatch,
  normalizeTeamName,
  resolveSignalOutcome,
  type PendingPick,
  type GameResult,
} from '@/lib/auto-resolve'
import { getNBAGames, type NBAGame } from '@/lib/sports/stats'
import type { SignalHistoryRecord } from '@/lib/signal-history'

/**
 * POST /api/picks/resolve
 *
 * Auto-resolve pending NBA picks for the authenticated user.
 * Fetches game results from balldontlie and determines outcomes
 * for moneyline, spread, and over/under picks. Props are skipped.
 *
 * Query params:
 *   date (optional) — resolve picks for a specific date (YYYY-MM-DD).
 *                      Defaults to all pending NBA picks with game_date in the past.
 */
export async function POST(request: Request) {
  return withAuthenticatedRoute(request, 'resolve-picks', async ({ user }) => {
    const { searchParams } = new URL(request.url)
    const dateFilter = searchParams.get('date')

    const supabase = await createServiceClient()

    // Fetch pending NBA picks for this user
    let query = supabase
      .from('user_picks')
      .select('id, external_game_id, sport, pick_type, pick_team, pick_line, odds, units, game_date')
      .eq('user_id', user.id)
      .eq('sport', 'nba')
      .is('outcome', null)

    if (dateFilter) {
      query = query.eq('game_date', dateFilter)
    } else {
      // Only resolve games that have already started (game_date in the past)
      query = query.lt('game_date', new Date().toISOString())
    }

    const { data: pendingPicks, error: picksError } = await query

    if (picksError) {
      console.error('[resolve] Failed to fetch pending picks:', picksError.message)
      return NextResponse.json(
        { error: 'Failed to fetch pending picks' },
        { status: 500 }
      )
    }

    if (!pendingPicks || pendingPicks.length === 0) {
      return NextResponse.json({
        message: 'No pending NBA picks to resolve',
        resolved: [],
        skipped: [],
      })
    }

    // Collect unique game dates to fetch results
    const uniqueDates = [...new Set(
      pendingPicks.map((p) => p.game_date.split('T')[0])
    )]

    // Fetch NBA game results for each date
    const allGames: GameResult[] = []
    for (const date of uniqueDates) {
      const result = await getNBAGames({ dates: [date] })
      if (result.data) {
        for (const g of result.data) {
          allGames.push(nbaGameToResult(g))
        }
      }
    }

    if (allGames.length === 0) {
      return NextResponse.json({
        message: 'No NBA game results available for the requested dates',
        resolved: [],
        skipped: pendingPicks.map((p) => ({
          pickId: p.id,
          reason: 'no game results available',
        })),
      })
    }

    // Run the resolver
    const { resolved, skipped } = resolvePicksBatch(
      pendingPicks as PendingPick[],
      allGames
    )

    // Apply resolved outcomes to the database
    let appliedCount = 0
    for (const r of resolved) {
      const { error: updateError } = await supabase
        .from('user_picks')
        .update({
          outcome: r.outcome,
          profit: r.profit,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', r.pickId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error(`[resolve] Failed to update pick ${r.pickId}:`, updateError.message)
      } else {
        appliedCount++
      }
    }

    // Also auto-resolve pending NBA signals using the same game results
    let signalsResolved = 0
    const { data: pendingSignals } = await supabase
      .from('signal_history')
      .select('*')
      .eq('sport', 'nba')
      .is('outcome', null)
      .lt('game_date', new Date().toISOString())

    if (pendingSignals && pendingSignals.length > 0) {
      for (const signal of pendingSignals as SignalHistoryRecord[]) {
        const signalDate = signal.game_date.split('T')[0]
        const game = allGames.find((g) => {
          if (g.status !== 'Final') return false
          if (g.date.split('T')[0] !== signalDate) return false
          const homeNorm = normalizeTeamName(g.homeTeam)
          const awayNorm = normalizeTeamName(g.awayTeam)
          return (
            normalizeTeamName(signal.home_team) === homeNorm &&
            normalizeTeamName(signal.away_team) === awayNorm
          )
        })

        if (!game || !signal.value_side) continue

        const outcome = resolveSignalOutcome(signal.value_side, game)

        const { error: sigError } = await supabase
          .from('signal_history')
          .update({ outcome, resolved_at: new Date().toISOString() })
          .eq('id', signal.id)

        if (!sigError) signalsResolved++
      }
    }

    return NextResponse.json({
      message: `Resolved ${appliedCount} pick(s) and ${signalsResolved} signal(s)`,
      resolved,
      skipped,
      signalsResolved,
    })
  })
}

/** GET /api/picks/resolve — check how many picks can be resolved */
export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'resolve-picks-check', async ({ user }) => {
    const supabase = await createServiceClient()

    const { count, error } = await supabase
      .from('user_picks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('sport', 'nba')
      .is('outcome', null)
      .lt('game_date', new Date().toISOString())

    if (error) {
      return NextResponse.json(
        { error: 'Failed to check pending picks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pendingCount: count ?? 0,
      message: count
        ? `${count} NBA pick(s) ready for auto-resolution`
        : 'No pending NBA picks to resolve',
    })
  })
}

function nbaGameToResult(game: NBAGame): GameResult {
  return {
    homeTeam: game.homeTeam.fullName,
    awayTeam: game.awayTeam.fullName,
    homeScore: game.homeTeamScore,
    awayScore: game.awayTeamScore,
    date: game.date,
    status: game.status,
  }
}
