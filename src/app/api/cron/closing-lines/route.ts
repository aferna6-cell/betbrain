import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  matchClosingLines,
  type PendingPickForCapture,
} from '@/lib/closing-line-capture'
import { getAllOdds } from '@/lib/sports/odds'
import type { NormalizedGame } from '@/lib/sports/config'

/**
 * GET /api/cron/closing-lines
 *
 * Vercel Cron-compatible endpoint that auto-captures closing lines for
 * pending picks. Snapshots the current consensus odds as closing_odds
 * for any pick whose game starts within the next 30 minutes.
 *
 * Secured by CRON_SECRET bearer token.
 *
 * Schedule: every 15 minutes — "* /15 * * * *" (vercel.json)
 * This ensures we capture odds close to game time without excessive API calls.
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
    const now = new Date()
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000) // 30 min from now

    // Fetch pending picks whose games start within the next 30 minutes
    // and don't yet have closing_odds
    const { data: pendingPicks, error: picksError } = await supabase
      .from('user_picks')
      .select('id, external_game_id, sport, pick_type, pick_team, odds, closing_odds, game_date')
      .is('closing_odds', null)
      .eq('outcome', 'pending')
      .lte('game_date', windowEnd.toISOString())
      .gte('game_date', now.toISOString())
      .limit(200)

    if (picksError) {
      console.error('[cron/closing-lines] Failed to fetch picks:', picksError.message)
      return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
    }

    if (!pendingPicks || pendingPicks.length === 0) {
      return NextResponse.json({
        message: 'No pending picks with upcoming games',
        captured: 0,
      })
    }

    // Get current cached odds for all sports (does NOT burn API calls — reads cache)
    const oddsMap = await getAllOdds()
    const allGames: NormalizedGame[] = []
    for (const result of oddsMap.values()) {
      allGames.push(...result.games)
    }

    if (allGames.length === 0) {
      return NextResponse.json({
        message: 'No cached odds available',
        captured: 0,
      })
    }

    // Match closing lines using pure function
    const matches = matchClosingLines(
      pendingPicks as PendingPickForCapture[],
      allGames
    )

    if (matches.length === 0) {
      return NextResponse.json({
        message: 'No matching odds found for pending picks',
        pending: pendingPicks.length,
        captured: 0,
      })
    }

    // Update picks with closing odds (parallel for performance)
    const results = await Promise.allSettled(
      matches.map((m) =>
        supabase
          .from('user_picks')
          .update({ closing_odds: m.closingOdds })
          .eq('id', m.pickId)
      )
    )

    const captured = results.filter(
      (r) => r.status === 'fulfilled' && !r.value.error
    ).length

    console.log(
      `[cron/closing-lines] Captured ${captured}/${matches.length} closing lines`
    )

    return NextResponse.json({
      message: `Captured closing lines for ${captured} picks`,
      pending: pendingPicks.length,
      matched: matches.length,
      captured,
    })
  } catch (err) {
    console.error('[cron/closing-lines] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal error during closing line capture' },
      { status: 500 }
    )
  }
}
