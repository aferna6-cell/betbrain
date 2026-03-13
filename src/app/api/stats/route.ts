import { NextResponse } from 'next/server'
import { badRequest, withAuthenticatedRoute } from '@/lib/api/route-handler'
import { getNBAGames, getNBATeams, isSupportedSport, UNSUPPORTED_SPORT_NOTE } from '@/lib/sports/stats'

const VALID_TYPES = ['games', 'teams'] as const

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'stats request', async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') ?? 'nba'
    const type = searchParams.get('type') ?? 'games'

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return badRequest(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`)
    }

    if (!isSupportedSport(sport)) {
      return NextResponse.json({ data: [], note: UNSUPPORTED_SPORT_NOTE })
    }

    if (type === 'teams') {
      const result = await getNBATeams()
      return NextResponse.json(result)
    }

    const date = searchParams.get('date')
    const result = await getNBAGames({ dates: date ? [date] : undefined })
    return NextResponse.json(result)
  })
}
