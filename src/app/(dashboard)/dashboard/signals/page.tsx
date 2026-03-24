import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { detectSmartSignals } from '@/lib/signals'
import { getSignalHistory, getSignalStats } from '@/lib/signal-history'
import { SmartSignalsView } from '@/components/smart-signals'
import { SignalHistoryView } from '@/components/signal-history'
import { SteamMovesView } from '@/components/steam-moves'
import { OddsVelocityPanel } from '@/components/odds-velocity'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Smart Signals — BetBrain',
  description: 'Games where odds, stats, and AI analysis align to indicate potential value.',
}

export default async function SignalsPage() {
  const [oddsMap, history, stats] = await Promise.all([
    getAllOdds(),
    getSignalHistory({ limit: 50 }),
    getSignalStats(),
  ])

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

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">
            Current Signals{signals.length > 0 ? ` (${signals.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="steam">
            Steam Moves
          </TabsTrigger>
          <TabsTrigger value="velocity">
            Line Velocity
          </TabsTrigger>
          <TabsTrigger value="history">
            Hit Rate{stats.hitRate !== null ? ` — ${stats.hitRate}%` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <SmartSignalsView signals={signals} />
        </TabsContent>

        <TabsContent value="steam">
          <SteamMovesView />
        </TabsContent>

        <TabsContent value="velocity">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Lines moving rapidly across multiple books often signal sharp action or breaking news.
              This view requires odds history snapshots to compare movement.
            </p>
            <OddsVelocityPanel alerts={[]} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <SignalHistoryView initialHistory={history} initialStats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
