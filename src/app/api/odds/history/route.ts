import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { badRequest } from '@/lib/api/route-handler'
import { getOddsHistory } from '@/lib/sports/odds'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'odds-history', async () => {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return badRequest('gameId is required')
    }

    const market = searchParams.get('market') ?? 'h2h'
    const snapshots = await getOddsHistory(gameId, market)

    return NextResponse.json({ snapshots })
  })
}
