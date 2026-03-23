import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { scanForEV, detectArbitrage } from '@/lib/ev-scanner'
import { analyzeAllConsensus } from '@/lib/consensus'
import { EVScannerView } from '@/components/ev-scanner-view'
import { ConsensusView } from '@/components/consensus-indicator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '+EV Scanner — BetBrain',
  description: 'Find positive expected value bets, arbitrage opportunities, and consensus/contrarian indicators.',
}

export default async function EVScannerPage() {
  const oddsMap = await getAllOdds()
  const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)

  const evResult = scanForEV(allGames)
  const arbs = detectArbitrage(allGames)
  const consensus = analyzeAllConsensus(allGames)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">+EV Scanner</h1>
        <p className="mt-1 text-muted-foreground">
          Bets where the bookmaker&apos;s odds are better than the fair market price — positive expected value.
        </p>
      </div>

      <Tabs defaultValue="ev">
        <TabsList>
          <TabsTrigger value="ev">
            +EV Bets{evResult.opportunities.length > 0 ? ` (${evResult.opportunities.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="consensus">
            Consensus{consensus.filter((c) => c.divergence).length > 0 ? ` (${consensus.filter((c) => c.divergence).length} diverge)` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ev">
          <EVScannerView
            opportunities={evResult.opportunities}
            arbitrage={arbs}
            gamesScanned={evResult.gamesScanned}
          />
        </TabsContent>

        <TabsContent value="consensus">
          <ConsensusView indicators={consensus} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
