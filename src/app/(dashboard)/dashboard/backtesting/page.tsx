import type { Metadata } from 'next'
import { BacktestForm } from '@/components/backtesting'

export const metadata: Metadata = {
  title: 'Historical Backtesting — BetBrain',
  description:
    'Simulate how Smart Signals and other strategies would have performed last season. See win rate, ROI, and game-by-game results.',
}

export default function BacktestingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historical Backtesting</h1>
        <p className="mt-1 text-muted-foreground">
          Simulate how BetBrain strategies performed last season. Select a sport, season, and
          strategy to see win rate, ROI, drawdown, and a game-by-game breakdown.
        </p>
      </div>

      <BacktestForm />
    </div>
  )
}
