import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { getAllOdds } from '@/lib/sports/odds'
import { scanForEV, detectArbitrage } from '@/lib/ev-scanner'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'ev-scanner', async () => {
    const oddsMap = await getAllOdds()
    const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)

    const evResult = scanForEV(allGames)
    const arbs = detectArbitrage(allGames)

    return NextResponse.json({
      opportunities: evResult.opportunities.map((o) => ({
        gameId: o.game.id,
        sport: o.game.sport,
        homeTeam: o.game.homeTeam,
        awayTeam: o.game.awayTeam,
        commenceTime: o.game.commenceTime,
        market: o.market,
        side: o.side,
        team: o.team,
        bookmaker: o.bookmaker,
        bookOdds: o.bookOdds,
        fairOdds: o.fairOdds,
        ev: o.ev,
        fairProbability: o.fairProbability,
        bookImplied: o.bookImplied,
      })),
      arbitrage: arbs.map((a) => ({
        gameId: a.game.id,
        sport: a.game.sport,
        homeTeam: a.game.homeTeam,
        awayTeam: a.game.awayTeam,
        homeBest: a.homeBest,
        awayBest: a.awayBest,
        totalImplied: a.totalImplied,
        profit: a.profit,
      })),
      meta: {
        gamesScanned: evResult.gamesScanned,
        totalBooks: evResult.totalBooks,
        evCount: evResult.opportunities.length,
        arbCount: arbs.length,
      },
    })
  })
}
