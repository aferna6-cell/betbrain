import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { scanForEV, detectArbitrage, detectMultiMarketArbitrage, scanAllMarketsForEV } from '@/lib/ev-scanner'
import { analyzeAllConsensus } from '@/lib/consensus'
import { findFadeOpportunities } from '@/lib/fade-public'
import { EVScannerView } from '@/components/ev-scanner-view'
import { ArbitrageScannerView } from '@/components/arbitrage-scanner'
import { ConsensusView } from '@/components/consensus-indicator'
import { FadePublicTool } from '@/components/fade-public'
import { SituationalSpotsPanel } from '@/components/situational-spots'
import { PublicMoneyPanel } from '@/components/public-money'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '+EV Scanner — BetBrain',
  description: 'Find positive expected value bets, arbitrage, consensus, contrarian fades, and situational spots.',
}

export default async function EVScannerPage() {
  const oddsMap = await getAllOdds()
  const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)

  const evResult = scanForEV(allGames)
  const arbs = detectArbitrage(allGames)
  const multiArbs = detectMultiMarketArbitrage(allGames)
  const fullEV = scanAllMarketsForEV(allGames)
  const consensus = analyzeAllConsensus(allGames)
  const fades = findFadeOpportunities(allGames)

  const totalEVCount = fullEV.allSorted.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">+EV Scanner</h1>
        <p className="mt-1 text-muted-foreground">
          Find value bets, arbitrage across all markets, contrarian plays, and situational edges.
        </p>
      </div>

      <Tabs defaultValue="ev">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ev">
            +EV Bets{totalEVCount > 0 ? ` (${totalEVCount})` : ''}
          </TabsTrigger>
          <TabsTrigger value="arb">
            Arbitrage{multiArbs.length > 0 ? ` (${multiArbs.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="consensus">
            Consensus{consensus.filter((c) => c.divergence).length > 0 ? ` (${consensus.filter((c) => c.divergence).length} diverge)` : ''}
          </TabsTrigger>
          <TabsTrigger value="fade">
            Fade Public{fades.opportunities.length > 0 ? ` (${fades.opportunities.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="spots">
            Situations
          </TabsTrigger>
          <TabsTrigger value="public">
            Public %
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ev">
          <EVScannerView
            opportunities={evResult.opportunities}
            arbitrage={arbs}
            gamesScanned={evResult.gamesScanned}
          />
        </TabsContent>

        <TabsContent value="arb">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Scans all games across moneyline, spread, and totals markets for arbitrage opportunities.
              An arb exists when combined implied probabilities across different bookmakers sum to less than 100%.
            </div>
            <ArbitrageScannerView arbs={multiArbs} gamesScanned={allGames.length} />
          </div>
        </TabsContent>

        <TabsContent value="consensus">
          <ConsensusView indicators={consensus} />
        </TabsContent>

        <TabsContent value="fade">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Identifies contrarian plays where going against the estimated public side may have value.
              Strongest signals come from sharp/public divergences.
            </div>
            <FadePublicTool games={allGames} />
          </div>
        </TabsContent>

        <TabsContent value="spots">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Detect schedule-based edges: back-to-backs, rest advantages, long road trips,
              and other situational factors that historically affect game outcomes.
            </div>
            <SituationalSpotsPanel games={allGames} />
          </div>
        </TabsContent>
        <TabsContent value="public">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Estimated public betting percentages based on odds patterns. Looks for favorite bias,
              bookmaker consensus, and outlier detection. These are estimates — not actual handle data.
            </div>
            <PublicMoneyPanel games={allGames} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
