import { NextResponse } from 'next/server'
import { badRequest, withAuthenticatedRoute } from '@/lib/api/route-handler'
import { isSport } from '@/lib/sports/config'
import { SPORT_PROP_MARKETS, isPropMarket } from '@/lib/sports/config'
import { getPropOddsForGame } from '@/lib/sports/props'
import type { PropMarket } from '@/lib/sports/props'

/**
 * GET /api/odds/props
 *
 * Returns aggregated player prop odds across bookmakers for a single game.
 *
 * Required query params:
 *   - gameId  (string)  The Odds API event ID
 *   - sport   (string)  nba | nfl | mlb | nhl
 *
 * Optional query params:
 *   - markets (string)  Comma-separated prop market keys to fetch.
 *                       Defaults to all markets configured for the sport.
 *                       Example: player_points,player_rebounds
 *
 * Response: PropOddsResult JSON
 */
export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'prop-odds', async ({ request }) => {
    const { searchParams } = new URL(request.url)

    const gameId = searchParams.get('gameId')
    if (!gameId) {
      return badRequest('gameId is required')
    }

    const sport = searchParams.get('sport')
    if (!sport) {
      return badRequest('sport is required')
    }
    if (!isSport(sport)) {
      return badRequest(`Invalid sport. Must be one of: nba, nfl, mlb, nhl`)
    }

    // Validate that the sport has at least one configured prop market
    const defaultMarkets = SPORT_PROP_MARKETS[sport]
    if (!defaultMarkets || defaultMarkets.length === 0) {
      return badRequest(`No prop markets available for sport: ${sport}`)
    }

    // Parse optional markets override
    let markets: PropMarket[] | undefined
    const marketsParam = searchParams.get('markets')
    if (marketsParam) {
      const requested = marketsParam.split(',').map((m) => m.trim()).filter(Boolean)
      const invalid = requested.filter((m) => !isPropMarket(m))
      if (invalid.length > 0) {
        return badRequest(`Invalid prop market(s): ${invalid.join(', ')}`)
      }
      markets = requested as PropMarket[]
    }

    const result = await getPropOddsForGame(gameId, sport, markets)
    return NextResponse.json(result)
  })
}
