import { NextResponse } from 'next/server'
import { badRequest, withAuthenticatedRoute } from '@/lib/api/route-handler'
import { getOddsForSport } from '@/lib/sports/odds'
import { checkAnalysisLimit, AnalysisLimitError } from '@/lib/ai/analysis'
import { analyzeInjuryImpact } from '@/lib/ai/injury-impact'
import { SUPPORTED_SPORTS, isSport } from '@/lib/sports/config'

export async function POST(request: Request) {
  return withAuthenticatedRoute(
    request,
    'injury-impact-analysis',
    async ({ user }) => {
      let body: {
        gameId?: string
        sport?: string
        playerName?: string
        injuryStatus?: string
      }
      try {
        body = await request.json()
      } catch {
        return badRequest('Invalid JSON body')
      }

      const { gameId, sport, playerName, injuryStatus } = body

      if (!gameId || typeof gameId !== 'string') {
        return badRequest('Missing required field: gameId')
      }
      if (!sport || !isSport(sport)) {
        return badRequest(
          `Invalid sport. Must be one of: ${SUPPORTED_SPORTS.join(', ')}`
        )
      }
      if (!playerName || typeof playerName !== 'string') {
        return badRequest('Missing required field: playerName')
      }
      if (!injuryStatus || typeof injuryStatus !== 'string') {
        return badRequest('Missing required field: injuryStatus')
      }

      // Check free tier limit (shared with game analysis)
      const limitCheck = await checkAnalysisLimit(user.id)
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: new AnalysisLimitError(limitCheck.used, limitCheck.limit)
              .message,
            used: limitCheck.used,
            limit: limitCheck.limit,
          },
          { status: 429 }
        )
      }

      // Find the game
      const oddsResult = await getOddsForSport(sport)
      const game = oddsResult.games.find((g) => g.id === gameId)

      if (!game) {
        return badRequest(
          'Game not found. It may have already started or is no longer available.'
        )
      }

      const analysis = await analyzeInjuryImpact(game, playerName, injuryStatus)
      return NextResponse.json(analysis)
    }
  )
}
