import { NextResponse } from 'next/server'
import {
  withAuthenticatedRoute,
  badRequest,
} from '@/lib/api/route-handler'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type UserPickInsert = Database['public']['Tables']['user_picks']['Insert']
type UserPickRow = Database['public']['Tables']['user_picks']['Row']

const VALID_PICK_TYPES = ['moneyline', 'spread', 'over', 'under', 'prop']
const VALID_SPORTS = ['nba', 'nfl', 'mlb', 'nhl']

export async function POST(request: Request) {
  return withAuthenticatedRoute(request, 'create-pick', async ({ user }) => {
    const body = await request.json()

    const {
      externalGameId,
      sport,
      pickType,
      pickTeam,
      pickLine,
      odds,
      units,
      gameDate,
      notes,
    } = body

    // Validate required fields
    if (!externalGameId || typeof externalGameId !== 'string') {
      return badRequest('externalGameId is required')
    }
    if (!sport || !VALID_SPORTS.includes(sport)) {
      return badRequest('sport must be one of: nba, nfl, mlb, nhl')
    }
    if (!pickType || !VALID_PICK_TYPES.includes(pickType)) {
      return badRequest('pickType must be one of: moneyline, spread, over, under, prop')
    }
    if (typeof odds !== 'number') {
      return badRequest('odds must be a number')
    }
    if (!gameDate || typeof gameDate !== 'string') {
      return badRequest('gameDate is required (YYYY-MM-DD)')
    }

    const supabase = await createServiceClient()

    const pick: UserPickInsert = {
      user_id: user.id,
      external_game_id: externalGameId,
      sport,
      pick_type: pickType,
      pick_team: pickTeam ?? null,
      pick_line: pickLine ?? null,
      odds,
      units: units ?? 1,
      game_date: gameDate,
      notes: notes ?? null,
    }

    const { data, error } = await supabase
      .from('user_picks')
      .insert(pick)
      .select('*')
      .single()

    if (error) {
      console.error('[picks] Failed to create pick:', error.message)
      return NextResponse.json(
        { error: 'Failed to save pick. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(data as UserPickRow)
  })
}

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'list-picks', async ({ user }) => {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('user_picks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[picks] Failed to fetch picks:', error.message)
      return NextResponse.json(
        { error: 'Failed to load picks. Please try again.' },
        { status: 500 }
      )
    }

    const picks = (data as UserPickRow[] | null) ?? []

    // Calculate summary stats
    const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
    const wins = resolved.filter((p) => p.outcome === 'win').length
    const losses = resolved.filter((p) => p.outcome === 'loss').length
    const pushes = resolved.filter((p) => p.outcome === 'push').length
    const totalProfit = resolved.reduce((sum, p) => sum + (p.profit ?? 0), 0)
    const totalUnits = resolved.reduce((sum, p) => sum + p.units, 0)
    const roi = totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0

    return NextResponse.json({
      picks,
      stats: {
        total: picks.length,
        wins,
        losses,
        pushes,
        pending: picks.length - resolved.length,
        totalProfit: Math.round(totalProfit * 100) / 100,
        roi: Math.round(roi * 100) / 100,
      },
    })
  })
}
