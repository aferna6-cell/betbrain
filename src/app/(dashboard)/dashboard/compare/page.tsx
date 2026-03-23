import type { Metadata } from 'next'
import { GameCompare } from '@/components/game-compare'

export const metadata: Metadata = {
  title: 'Compare Games — BetBrain',
  description: 'Side-by-side comparison of games, odds, and AI analysis.',
}

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compare Games</h1>
        <p className="text-sm text-muted-foreground">
          Select 2-5 games to compare side by side. See key metrics, odds, and analysis at a glance.
        </p>
      </div>
      <GameCompare />
    </div>
  )
}
