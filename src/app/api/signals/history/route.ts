import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { badRequest } from '@/lib/api/route-handler'
import { getSignalHistory, getSignalStats, resolveSignal } from '@/lib/signal-history'
import type { Sport } from '@/lib/supabase/types'

const VALID_SPORTS = new Set(['nba', 'nfl', 'mlb', 'nhl'])
const VALID_OUTCOMES = new Set(['win', 'loss', 'push', 'pending'])

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'signal-history', async () => {
    const url = new URL(request.url)
    const sport = url.searchParams.get('sport')
    const outcome = url.searchParams.get('outcome')
    const limit = url.searchParams.get('limit')

    if (sport && !VALID_SPORTS.has(sport)) {
      return badRequest('Invalid sport')
    }
    if (outcome && !VALID_OUTCOMES.has(outcome)) {
      return badRequest('Invalid outcome filter')
    }

    const [history, stats] = await Promise.all([
      getSignalHistory({
        sport: sport as Sport | undefined,
        outcome: outcome as 'win' | 'loss' | 'push' | 'pending' | undefined,
        limit: limit ? parseInt(limit, 10) : 50,
      }),
      getSignalStats(),
    ])

    return NextResponse.json({ history, stats })
  })
}

export async function PATCH(request: Request) {
  return withAuthenticatedRoute(request, 'signal-history-resolve', async () => {
    const body = await request.json()
    const { externalGameId, outcome } = body as {
      externalGameId?: string
      outcome?: string
    }

    if (!externalGameId || typeof externalGameId !== 'string') {
      return badRequest('externalGameId is required')
    }
    if (!outcome || !['win', 'loss', 'push'].includes(outcome)) {
      return badRequest('outcome must be win, loss, or push')
    }

    const success = await resolveSignal(
      externalGameId,
      outcome as 'win' | 'loss' | 'push'
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to resolve signal' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  })
}
