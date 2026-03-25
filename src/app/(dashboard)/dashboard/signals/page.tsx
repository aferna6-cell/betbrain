import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { detectSmartSignals } from '@/lib/signals'
import { getSignalHistory, getSignalStats } from '@/lib/signal-history'
import { SmartSignalsView } from '@/components/smart-signals'
import { SignalHistoryView } from '@/components/signal-history'
import { SteamMovesView } from '@/components/steam-moves'
import { OddsVelocityPanel } from '@/components/odds-velocity'
import { LineMovementHeatmap } from '@/components/line-movement-heatmap'
import { SharpMoneyFlowPanel } from '@/components/sharp-money-flow'
import { detectSharpFlow, type SharpSignal, type GameOddsTimeline, type OddsPoint } from '@/lib/sharp-money-flow'
import { trackConsensus } from '@/lib/consensus-line-tracker'
import { ConsensusLineTrackerPanel } from '@/components/consensus-line-tracker'
import { CustomSignalBuilder } from '@/components/custom-signal-builder'
import { scanForRLM } from '@/lib/rlm-alerts'
import { RLMAlertsPanel } from '@/components/rlm-alerts'
import { LineVelocityAlerts } from '@/components/line-velocity-alerts'
import { CrossSportSharpPanel } from '@/components/cross-sport-sharp'
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
  const consensusTracker = trackConsensus(allGames)
  const rlmResult = scanForRLM(allGames)

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
          <TabsTrigger value="heatmap">
            Heatmap
          </TabsTrigger>
          <TabsTrigger value="sharp">
            Sharp Flow
          </TabsTrigger>
          <TabsTrigger value="consensus">
            Consensus{consensusTracker.gamesWithDeviations > 0 ? ` (${consensusTracker.gamesWithDeviations})` : ''}
          </TabsTrigger>
          <TabsTrigger value="rlm">
            RLM{rlmResult.alerts.length > 0 ? ` (${rlmResult.alerts.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="vel-alerts">
            Velocity Alerts
          </TabsTrigger>
          <TabsTrigger value="cross-sport">
            Cross-Sport
          </TabsTrigger>
          <TabsTrigger value="custom">
            Custom Rules
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

        <TabsContent value="heatmap">
          <div className="mt-4">
            <LineMovementHeatmap games={allGames} />
          </div>
        </TabsContent>

        <TabsContent value="sharp">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Detects reverse line movement, late steam, and opening line value.
              Sharp money moves lines opposite to public action — the strongest edge signal.
            </p>
            <SharpMoneyFlowPanel
              summary={{ totalSignals: 0, rlmCount: 0, lateSteamCount: 0, openingValueCount: 0, strongSignals: [], multiSignalGames: [] }}
              signals={[]}
            />
          </div>
        </TabsContent>

        <TabsContent value="consensus">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Market consensus lines with bookmaker deviations. Books deviating from the median may
              offer value (stale lines) or signal early movement.
            </p>
            <ConsensusLineTrackerPanel result={consensusTracker} />
          </div>
        </TabsContent>

        <TabsContent value="rlm">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Reverse Line Movement detects games where the line moves against expected public action.
              This is the strongest indicator of sharp money — pros betting enough to move the line
              opposite to public sentiment.
            </p>
            <RLMAlertsPanel result={rlmResult} />
          </div>
        </TabsContent>

        <TabsContent value="vel-alerts">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure custom velocity thresholds per market type. Alerts fire when
              line movement exceeds your thresholds within the time window, with cooldown
              to prevent spam. Supports sport-specific sensitivity.
            </p>
            <LineVelocityAlerts />
          </div>
        </TabsContent>

        <TabsContent value="cross-sport">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Detects simultaneous sharp line movements across multiple sports within a 30-minute window.
              Cross-sport correlations may indicate syndicate plays or coordinated sharp action.
            </p>
            <CrossSportSharpPanel games={allGames} />
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="mt-4">
            <CustomSignalBuilder games={allGames} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <SignalHistoryView initialHistory={history} initialStats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
