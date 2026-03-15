import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Smart Signals — BetBrain',
  description: 'Games where odds, stats, and AI analysis align to indicate potential value.',
}
import { detectSmartSignals } from '@/lib/signals'
import { SmartSignalsView } from '@/components/smart-signals'

export default async function SignalsPage() {
  const oddsMap = await getAllOdds()
  const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)
  const signals = await detectSmartSignals(allGames)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Smart Signals</h1>
        <p className="mt-1 text-muted-foreground">
          Games where odds, AI analysis, and market data align — the strongest value plays.
        </p>
      </div>

      <SmartSignalsView signals={signals} />
    </div>
  )
}
