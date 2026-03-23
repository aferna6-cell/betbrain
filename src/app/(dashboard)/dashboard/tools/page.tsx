import type { Metadata } from 'next'
import { OddsConverter } from '@/components/odds-converter'
import { MonteCarloSimulator } from '@/components/monte-carlo'

export const metadata: Metadata = {
  title: 'Odds Tools — BetBrain',
  description:
    'Convert between odds formats, calculate vig, and simulate bankroll outcomes.',
}

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Odds Tools</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Convert between odds formats, calculate vig, and project bankroll outcomes.
        </p>
      </div>

      <OddsConverter />

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
