import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getGameById } from '@/lib/sports/odds'
import { GameDetail } from '@/components/game-detail'

export const revalidate = 300 // Rebuild every 5 minutes

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Game Detail — BetBrain',
    description: 'Odds comparison, AI analysis, and line movement for this game.',
  }
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const game = await getGameById(gameId)

  if (!game) {
    notFound()
  }

  return <GameDetail game={game} />
}
