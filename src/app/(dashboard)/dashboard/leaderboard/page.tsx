import type { Metadata } from 'next'
import { Leaderboard } from '@/components/leaderboard'

export const metadata: Metadata = {
  title: 'Leaderboard — BetBrain',
  description:
    'Top performers in the BetBrain community ranked by ROI, profit, and win rate.',
}

export default function LeaderboardPage() {
  return <Leaderboard />
}
