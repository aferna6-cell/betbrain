import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNBAGames, getNBATeams, isSupportedSport, UNSUPPORTED_SPORT_NOTE } from '@/lib/sports/stats'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') ?? 'nba'
  const type = searchParams.get('type') ?? 'games'

  if (!isSupportedSport(sport)) {
    return NextResponse.json({ data: [], note: UNSUPPORTED_SPORT_NOTE })
  }

  if (type === 'teams') {
    const result = await getNBATeams()
    return NextResponse.json(result)
  }

  // Default: games
  const dates = searchParams.get('date') ? [searchParams.get('date')!] : undefined
  const result = await getNBAGames({ dates })
  return NextResponse.json(result)
}
