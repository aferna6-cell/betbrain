import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/leaderboard'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') as 'roi' | 'profit' | 'winRate' | 'picks' | null

  const validSorts = ['roi', 'profit', 'winRate', 'picks'] as const
  const sortBy =
    sort && (validSorts as readonly string[]).includes(sort)
      ? (sort as 'roi' | 'profit' | 'winRate' | 'picks')
      : 'roi'

  const result = getLeaderboard(sortBy)

  return NextResponse.json(result)
}
