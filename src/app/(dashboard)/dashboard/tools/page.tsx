import type { Metadata } from 'next'
import { OddsConverter } from '@/components/odds-converter'
import { MonteCarloSimulator } from '@/components/monte-carlo'
import { BetCalculator } from '@/components/bet-calculator'
import { ApiUsageForecastPanel } from '@/components/api-usage-forecast'
import { BetGradingCard } from '@/components/bet-grading'
import { AutoGradePanel } from '@/components/auto-grade'
import { PickImportPanel } from '@/components/pick-import'
import { KellySimulatorPanel } from '@/components/kelly-simulator'
import { PositionSizingBacktestPanel } from '@/components/position-sizing-backtest'
import { SizingConfidenceMatrixPanel } from '@/components/sizing-confidence-matrix'
import { PortfolioRiskPanel } from '@/components/portfolio-risk'
import { getOddsApiUsage } from '@/lib/sports/odds'

export const metadata: Metadata = {
  title: 'Odds Tools — BetBrain',
  description:
    'Bet calculator, odds converter, vig calculator, and bankroll projections.',
}

export const dynamic = 'force-dynamic'

export default async function ToolsPage() {
  const apiUsage = await getOddsApiUsage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Odds Tools</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bet calculator, odds converter, vig calculator, and bankroll projections.
        </p>
      </div>

      <div className="border-b border-border pb-6">
        <h2 className="text-xl font-bold mb-2">Odds API Budget</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Monitor your Odds API usage and forecast when you&apos;ll run out of requests this month.
        </p>
        <ApiUsageForecastPanel usedRequests={apiUsage.count} monthlyBudget={apiUsage.limit} />
      </div>

      <div className="border-b border-border pb-6">
        <h2 className="text-xl font-bold mb-2">Portfolio Risk Gauge</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Real-time portfolio-level risk exposure visualization. Shows sport concentration,
          correlated bets, and overall risk score for your open picks.
        </p>
        <PortfolioRiskPanel />
      </div>

      <div className="border-b border-border pb-6">
        <BetGradingCard />
      </div>

      <div className="border-b border-border pb-6">
        <h2 className="text-xl font-bold mb-2">Auto-Grade Picks</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Automatically grade your resolved picks based on available metadata — timing, CLV, sizing discipline, and chase detection.
        </p>
        <AutoGradePanel />
      </div>

      <div className="border-b border-border pb-6">
        <h2 className="text-xl font-bold mb-2">Import Picks</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Bulk import historical picks from a CSV file. Supports flexible column names and multiple date formats.
        </p>
        <PickImportPanel />
      </div>

      <BetCalculator />

      <div className="border-t border-border pt-6">
        <OddsConverter />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Kelly Fraction Simulator</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Compare bankroll trajectories with different Kelly fractions. See how aggressive
          vs conservative sizing affects growth, volatility, and ruin risk.
        </p>
        <KellySimulatorPanel />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Bankroll Projections</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use Monte Carlo simulation to project likely bankroll outcomes based on your stats.
        </p>
        <MonteCarloSimulator />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Sizing Confidence Matrix</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Interactive grid showing optimal unit count at each combination of confidence level and edge size.
          Helps standardize position sizing decisions.
        </p>
        <SizingConfidenceMatrixPanel />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Position Sizing Backtest</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Replay your pick history with different staking strategies (flat, percentage, Kelly, confidence-scaled)
          to see which sizing approach would have performed best.
        </p>
        <PositionSizingBacktestPanel picks={[]} />
      </div>
    </div>
  )
}
