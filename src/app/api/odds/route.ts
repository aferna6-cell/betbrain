import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOddsForSport, getAllOdds } from '@/lib/sports/odds'
import type { Sport } from '@/lib/supabase/types'

const VALID_SPORTS: Sport[] = ['nba', 'nfl', 'mlb', 'nhl']

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') as Sport | null

  if (sport) {
    if (!VALID_SPORTS.includes(sport)) {
      return NextResponse.json(
        { error: `Invalid sport. Must be one of: ${VALID_SPORTS.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await getOddsForSport(sport)
    return NextResponse.json(result)
  }

  // No sport specified — return all sports
  const allOdds = await getAllOdds()
  const response: Record<string, unknown> = {}
  for (const [key, value] of allOdds) {
    response[key] = value
  }

  return NextResponse.json(response)
}
