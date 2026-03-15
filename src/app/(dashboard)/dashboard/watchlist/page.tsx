import type { Metadata } from 'next'
import { WatchlistPanel } from '@/components/watchlist'

export const metadata: Metadata = {
  title: 'Watchlist — BetBrain',
  description: 'Your starred games. Quick access to games you want to track.',
}

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Watchlist</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Games you&apos;ve starred for quick access. Star games from the dashboard or game detail.
        </p>
      </div>

      <WatchlistPanel defaultOpen />
    </div>
  )
}
