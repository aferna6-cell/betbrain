import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getGameById } from '@/lib/sports/odds'
import { GameDetail } from '@/components/game-detail'

export const revalidate = 300 // Rebuild every 5 minutes

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>
}): Promise<Metadata> {
  const { gameId } = await params
  const game = await getGameById(gameId)

  if (!game) {
    return {
      title: 'Game Not Found — BetBrain',
      description: 'This game could not be found.',
    }
  }

  const title = `${game.awayTeam} @ ${game.homeTeam} — BetBrain`
  const description = `Odds comparison, AI analysis, and line movement for ${game.awayTeam} vs ${game.homeTeam}.`

  return {
    title,
    description,
    openGraph: { title, description },
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
