import { NextResponse } from 'next/server'
import { badRequest, withAuthenticatedRoute } from '@/lib/api/route-handler'
import { SUPPORTED_SPORTS, isSport } from '@/lib/sports/config'
import { getOddsForSport, getAllOdds } from '@/lib/sports/odds'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'odds request', async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const requestedSport = searchParams.get('sport')

    if (requestedSport) {
      if (!isSport(requestedSport)) {
        return badRequest(
          `Invalid sport. Must be one of: ${SUPPORTED_SPORTS.join(', ')}`
        )
      }

      const result = await getOddsForSport(requestedSport)
      return NextResponse.json(result)
    }

    const allOdds = await getAllOdds()
    return NextResponse.json(Object.fromEntries(allOdds))
  })
}
