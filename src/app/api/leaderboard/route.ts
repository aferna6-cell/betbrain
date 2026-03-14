import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/leaderboard'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') as 'roi' | 'profit' | 'winRate' | 'picks' | null

    const validSorts = ['roi', 'profit', 'winRate', 'picks'] as const
    const sortBy =
      sort && (validSorts as readonly string[]).includes(sort)
        ? (sort as 'roi' | 'profit' | 'winRate' | 'picks')
        : 'roi'

    const result = getLeaderboard(sortBy)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[leaderboard] failed:', error)
    return NextResponse.json(
      { error: 'Failed to load leaderboard. Please try again.' },
      { status: 500 }
    )
  }
}
