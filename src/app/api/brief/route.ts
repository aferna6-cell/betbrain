import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { getAllOdds } from '@/lib/sports/odds'
import { scanForEV } from '@/lib/ev-scanner'
import { predictGameScript } from '@/lib/game-script'
import { generateMorningBrief } from '@/lib/morning-brief'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'morning-brief', async () => {
    // Fetch odds (from cache)
    const oddsMap = await getAllOdds()
    const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)

    // EV scanner
    const evResult = scanForEV(allGames)

    // Game scripts for all games
    const scripts = allGames.map((game) => predictGameScript(game))

    // Build brief (no performance data from API — client can overlay)
    const brief = generateMorningBrief(
      allGames,
      evResult.opportunities,
      scripts,
      [], // situational spots — would need schedule data
      null // performance — client-side from localStorage
    )

    return NextResponse.json(brief)
  })
}
