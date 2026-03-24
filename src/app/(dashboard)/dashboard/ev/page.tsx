import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { scanForEV, detectArbitrage, detectMultiMarketArbitrage, scanAllMarketsForEV } from '@/lib/ev-scanner'
import { analyzeAllConsensus } from '@/lib/consensus'
import { findFadeOpportunities } from '@/lib/fade-public'
import { predictAllGameScripts } from '@/lib/game-script'
import { calculateAllWinProbabilities } from '@/lib/win-probability'
import { analyzeAllImpliedTotals } from '@/lib/implied-team-totals'
import { analyzeAllSpreadVsML } from '@/lib/spread-vs-ml'
import { identifySharpBooks } from '@/lib/sharp-book-identifier'
import { EVScannerView } from '@/components/ev-scanner-view'
import { ArbitrageScannerView } from '@/components/arbitrage-scanner'
import { GameScriptPanel } from '@/components/game-script-panel'
import { WinProbabilityPanel } from '@/components/win-probability'
import { ConsensusView } from '@/components/consensus-indicator'
import { FadePublicTool } from '@/components/fade-public'
import { SituationalSpotsPanel } from '@/components/situational-spots'
import { PublicMoneyPanel } from '@/components/public-money'
import { ImpliedTeamTotalsPanel } from '@/components/implied-team-totals'
import { SpreadVsMLPanel } from '@/components/spread-vs-ml'
import { SharpBookPanel } from '@/components/sharp-book-identifier'
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
  const gameScripts = predictAllGameScripts(allGames)
  const winProbs = calculateAllWinProbabilities(allGames)
  const consensus = analyzeAllConsensus(allGames)
  const fades = findFadeOpportunities(allGames)
  const impliedTotals = analyzeAllImpliedTotals(allGames)
  const spreadVsML = analyzeAllSpreadVsML(allGames)
  const sharpBooks = identifySharpBooks(allGames)

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
          <TabsTrigger value="scripts">
            Game Scripts{gameScripts.length > 0 ? ` (${gameScripts.length})` : ''}
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
          <TabsTrigger value="winprob">
            Win Prob{winProbs.length > 0 ? ` (${winProbs.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="public">
            Public %
          </TabsTrigger>
          <TabsTrigger value="teamtotals">
            Team Totals{impliedTotals.length > 0 ? ` (${impliedTotals.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="spreadml">
            Spread vs ML
          </TabsTrigger>
          <TabsTrigger value="sharpbooks">
            Sharp Books{sharpBooks.scores.length > 0 ? ` (${sharpBooks.scores.length})` : ''}
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

        <TabsContent value="scripts">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Predicts game flow — blowout, close game, or overtime candidate — based on spread,
              total, and moneyline patterns across bookmakers.
            </div>
            <GameScriptPanel scripts={gameScripts} />
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
        <TabsContent value="winprob">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              No-vig win probabilities derived from bookmaker consensus. Shows how much
              each book agrees/disagrees and which books are most bullish on each team.
            </div>
            <WinProbabilityPanel probabilities={winProbs} />
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

        <TabsContent value="teamtotals">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Implied team totals derived from game total + spread. Shows expected scoring per team
              and identifies high/low scoring environments across bookmakers.
            </div>
            <ImpliedTeamTotalsPanel results={impliedTotals} />
          </div>
        </TabsContent>

        <TabsContent value="spreadml">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Compares spread vs moneyline value for each side. Identifies when the ML offers better
              risk/reward than the spread and vice versa based on favorite size and payout ratio.
            </div>
            <SpreadVsMLPanel result={spreadVsML} />
          </div>
        </TabsContent>

        <TabsContent value="sharpbooks">
          <div className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              Ranks bookmakers by &ldquo;sharpness&rdquo; — how independently they set lines.
              Sharp books deviate from consensus more often and consistently offer the best prices.
            </div>
            <SharpBookPanel result={sharpBooks} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
