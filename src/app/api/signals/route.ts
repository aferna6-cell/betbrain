import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { getAllOdds } from '@/lib/sports/odds'
import { detectSmartSignals } from '@/lib/signals'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'smart-signals', async () => {
    const oddsMap = await getAllOdds()

    // Combine all games across sports
    const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)

    const signals = await detectSmartSignals(allGames)

    return NextResponse.json({
      signals,
      total: signals.length,
      strong: signals.filter((s) => s.strength === 'strong').length,
      moderate: signals.filter((s) => s.strength === 'moderate').length,
    })
  })
}
