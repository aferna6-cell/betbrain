import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { scanForEV, detectArbitrage } from '@/lib/ev-scanner'
import { EVScannerView } from '@/components/ev-scanner-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '+EV Scanner — BetBrain',
  description: 'Find positive expected value bets and arbitrage opportunities across bookmakers.',
}

export default async function EVScannerPage() {
  const oddsMap = await getAllOdds()
  const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)

  const evResult = scanForEV(allGames)
  const arbs = detectArbitrage(allGames)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">+EV Scanner</h1>
        <p className="mt-1 text-muted-foreground">
          Bets where the bookmaker&apos;s odds are better than the fair market price — positive expected value.
        </p>
      </div>

      <EVScannerView
        opportunities={evResult.opportunities}
        arbitrage={arbs}
        gamesScanned={evResult.gamesScanned}
      />
    </div>
  )
}
