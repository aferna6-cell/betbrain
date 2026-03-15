import type { Metadata } from 'next'
import { PicksTracker } from '@/components/picks-tracker'

export const metadata: Metadata = {
  title: 'Pick Tracker — BetBrain',
  description: 'Track your picks, record, and ROI over time.',
}

export default function PicksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pick Tracker</h1>
        <p className="mt-1 text-muted-foreground">
          Log your picks and track your record over time. No real money — analytics only.
        </p>
      </div>

      <PicksTracker />
    </div>
  )
}
