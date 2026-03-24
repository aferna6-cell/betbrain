import type { Metadata } from 'next'
import { getAllOdds } from '@/lib/sports/odds'
import { ValuePlaysFullPage } from '@/components/value-plays-full'
import type { NormalizedGame } from '@/lib/sports/config'

export const metadata: Metadata = {
  title: 'Value Plays — BetBrain',
  description: 'All value plays across today\'s games — +EV, key lines, bookmaker disagreements.',
}

export const revalidate = 300 // 5 minutes

export default async function ValuePage() {
  const oddsMap = await getAllOdds()

  const allGames: NormalizedGame[] = []
  for (const [, result] of oddsMap) {
    allGames.push(...result.games)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Value Plays</h1>
        <p className="mt-1 text-muted-foreground">
          Every value opportunity across today&apos;s games, ranked by composite score.
        </p>
      </div>

      <ValuePlaysFullPage games={allGames} />
    </div>
  )
}
