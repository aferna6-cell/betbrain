import { NextResponse } from 'next/server'
import {
  withAuthenticatedRoute,
  badRequest,
} from '@/lib/api/route-handler'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateCLV, calculateCLVStats } from '@/lib/clv'
import type { Database, Sport, PickType } from '@/lib/supabase/types'

type UserPickInsert = Database['public']['Tables']['user_picks']['Insert']
type UserPickRow = Database['public']['Tables']['user_picks']['Row']

const VALID_PICK_TYPES = ['moneyline', 'spread', 'over', 'under', 'prop']
const VALID_SPORTS = ['nba', 'nfl', 'mlb', 'nhl']

export async function POST(request: Request) {
  return withAuthenticatedRoute(request, 'create-pick', async ({ user }) => {
    let body: {
      externalGameId?: string
      sport?: string
      pickType?: string
      pickTeam?: string
      pickLine?: number
      odds?: number
      closingOdds?: number
      units?: number
      gameDate?: string
      notes?: string
    }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }

    const {
      externalGameId,
      sport,
      pickType,
      pickTeam,
      pickLine,
      odds,
      closingOdds,
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
      sport: sport as Sport,
      pick_type: pickType as PickType,
      pick_team: pickTeam ?? null,
      pick_line: pickLine ?? null,
      odds,
      closing_odds: closingOdds ?? null,
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

    // Calculate CLV stats
    const clvStats = calculateCLVStats(picks)

    // Add per-pick CLV
    const picksWithCLV = picks.map((p) => ({
      ...p,
      clv: p.closing_odds != null ? calculateCLV(p.odds, p.closing_odds) : null,
    }))

    return NextResponse.json({
      picks: picksWithCLV,
      stats: {
        total: picks.length,
        wins,
        losses,
        pushes,
        pending: picks.length - resolved.length,
        totalProfit: Math.round(totalProfit * 100) / 100,
        roi: Math.round(roi * 100) / 100,
      },
      clvStats,
    })
  })
}

export async function PATCH(request: Request) {
  return withAuthenticatedRoute(request, 'update-pick', async ({ user }) => {
    let body: {
      pickId?: string
      closingOdds?: number
      outcome?: string
      profit?: number
    }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }

    const { pickId, closingOdds, outcome, profit } = body

    if (!pickId || typeof pickId !== 'string') {
      return badRequest('pickId is required')
    }

    const updates: Record<string, unknown> = {}
    if (closingOdds !== undefined) {
      if (typeof closingOdds !== 'number') return badRequest('closingOdds must be a number')
      updates.closing_odds = closingOdds
    }
    if (outcome !== undefined) {
      if (!['win', 'loss', 'push', 'pending'].includes(outcome)) {
        return badRequest('outcome must be win, loss, push, or pending')
      }
      updates.outcome = outcome
      if (outcome !== 'pending') {
        updates.resolved_at = new Date().toISOString()
      }
    }
    if (profit !== undefined) {
      if (typeof profit !== 'number') return badRequest('profit must be a number')
      updates.profit = profit
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No fields to update')
    }

    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('user_picks')
      .update(updates)
      .eq('id', pickId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      console.error('[picks] Failed to update pick:', error.message)
      return NextResponse.json(
        { error: 'Failed to update pick. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(data as UserPickRow)
  })
}

export async function DELETE(request: Request) {
  return withAuthenticatedRoute(request, 'delete-pick', async ({ user }) => {
    const { searchParams } = new URL(request.url)
    const pickId = searchParams.get('id')

    if (!pickId) {
      return badRequest('id query parameter is required')
    }

    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('user_picks')
      .delete()
      .eq('id', pickId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[picks] Failed to delete pick:', error.message)
      return NextResponse.json(
        { error: 'Failed to delete pick. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted: true })
  })
}
