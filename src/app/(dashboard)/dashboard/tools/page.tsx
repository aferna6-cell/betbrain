import type { Metadata } from 'next'
import { OddsConverter } from '@/components/odds-converter'
import { MonteCarloSimulator } from '@/components/monte-carlo'
import { BetCalculator } from '@/components/bet-calculator'

export const metadata: Metadata = {
  title: 'Odds Tools — BetBrain',
  description:
    'Bet calculator, odds converter, vig calculator, and bankroll projections.',
}

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Odds Tools</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bet calculator, odds converter, vig calculator, and bankroll projections.
        </p>
      </div>

      <BetCalculator />

      <div className="border-t border-border pt-6">
        <OddsConverter />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-bold mb-2">Bankroll Projections</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use Monte Carlo simulation to project likely bankroll outcomes based on your stats.
        </p>
        <MonteCarloSimulator />
      </div>
    </div>
  )
}
