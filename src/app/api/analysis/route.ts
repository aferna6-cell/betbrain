import { NextResponse } from 'next/server'
import { badRequest, withAuthenticatedRoute } from '@/lib/api/route-handler'
import { getOddsForSport } from '@/lib/sports/odds'
import {
  analyzeGame,
  checkAnalysisLimit,
  AnalysisLimitError,
} from '@/lib/ai/analysis'
import { SUPPORTED_SPORTS, isSport } from '@/lib/sports/config'

export async function POST(request: Request) {
  return withAuthenticatedRoute(request, 'game analysis', async ({ user }) => {
    let body: { gameId?: string; sport?: string }

    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }

    const { gameId, sport } = body

    if (!gameId || typeof gameId !== 'string') {
      return badRequest('Missing required field: gameId')
    }

    if (!sport || !isSport(sport)) {
      return badRequest(
        `Invalid sport. Must be one of: ${SUPPORTED_SPORTS.join(', ')}`
      )
    }

    // Find the game in our odds data
    const oddsResult = await getOddsForSport(sport)
    const game = oddsResult.games.find((g) => g.id === gameId)

    if (!game) {
      return badRequest(
        'Game not found. It may have already started or is no longer available.'
      )
    }

    try {
      const analysis = await analyzeGame(game, user.id)
      return NextResponse.json(analysis)
    } catch (error) {
      if (error instanceof AnalysisLimitError) {
        return NextResponse.json(
          {
            error: error.message,
            used: error.used,
            limit: error.limit,
          },
          { status: 429 }
        )
      }
      throw error
    }
  })
}

export async function GET(request: Request) {
  return withAuthenticatedRoute(
    request,
    'analysis limit check',
    async ({ user }) => {
      const limit = await checkAnalysisLimit(user.id)
      return NextResponse.json(limit)
    }
  )
}
