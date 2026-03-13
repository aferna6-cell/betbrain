import { notFound } from 'next/navigation'
import { getGameById } from '@/lib/sports/odds'
import { GameDetail } from '@/components/game-detail'

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
