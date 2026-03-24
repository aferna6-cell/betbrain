import type { Metadata } from 'next'
import { BettingJournal } from '@/components/betting-journal'
import { ReviewHistory } from '@/components/daily-review'

export const metadata: Metadata = {
  title: 'Betting Journal — BetBrain',
  description: 'Document your daily betting journey with mood tracking, bankroll snapshots, and lessons learned.',
}

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Betting Journal</h1>
        <p className="text-sm text-muted-foreground">
          Track your daily mindset, bankroll, and lessons. Build better habits.
        </p>
      </div>
      <BettingJournal />

      <div className="pt-6">
        <h2 className="text-xl font-bold mb-1">Daily Reviews</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Grade your daily decision-making process separately from outcomes.
        </p>
        <ReviewHistory />
      </div>
    </div>
  )
}
