import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { createServiceClient } from '@/lib/supabase/server'
import { detectSteamMoves } from '@/lib/steam-moves'
import type { OddsSnapshot } from '@/lib/steam-moves'

/**
 * GET /api/odds/steam
 *
 * Returns detected steam moves (rapid line movement) across all upcoming games.
 * Reads from odds_history — no external API calls.
 */
export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'steam-moves', async () => {
    const supabase = await createServiceClient()

    // Fetch odds history from the last 2 hours for all games
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('odds_history')
      .select(
        'external_game_id, bookmaker, market, home_odds, away_odds, spread_home, spread_away, spread_line, total_over, total_under, total_line, fetched_at'
      )
      .gt('fetched_at', twoHoursAgo)
      .order('fetched_at', { ascending: true })
      .limit(2000)

    if (error) {
      console.error('[steam] Failed to fetch odds history:', error.message)
      return NextResponse.json({ steamMoves: [] })
    }

    const snapshots = (data ?? []) as OddsSnapshot[]

    // Group by game and detect steam moves per game
    const byGame = new Map<string, OddsSnapshot[]>()
    for (const snap of snapshots) {
      const key = snap.external_game_id
      if (!byGame.has(key)) byGame.set(key, [])
      byGame.get(key)!.push(snap)
    }

    const allMoves = []
    for (const [, gameSnaps] of byGame) {
      const moves = detectSteamMoves(gameSnaps)
      allMoves.push(...moves)
    }

    // Sort by magnitude descending
    allMoves.sort((a, b) => b.magnitudePP - a.magnitudePP)

    return NextResponse.json({
      steamMoves: allMoves.slice(0, 20), // Top 20 most significant
      totalDetected: allMoves.length,
      snapshotsAnalyzed: snapshots.length,
    })
  })
}
