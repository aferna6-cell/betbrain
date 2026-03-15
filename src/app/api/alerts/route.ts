import { NextResponse } from 'next/server'
import { withAuthenticatedRoute, badRequest } from '@/lib/api/route-handler'
import { createAlert, getUserAlerts, deleteAlert } from '@/lib/alerts'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'list-alerts', async ({ user }) => {
    const alerts = await getUserAlerts(user.id)

    const active = alerts.filter((a) => !a.triggered)
    const triggered = alerts.filter((a) => a.triggered)

    return NextResponse.json({
      alerts,
      active: active.length,
      triggered: triggered.length,
    })
  })
}

export async function POST(request: Request) {
  return withAuthenticatedRoute(request, 'create-alert', async ({ user }) => {
    let body: {
      externalGameId?: string
      sport?: string
      team?: string
      side?: string
      market?: string
      condition?: string
      threshold?: number
    }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }

    const { externalGameId, sport, team, side, market, condition, threshold } = body

    const validMarkets = ['moneyline', 'spreads', 'totals']

    if (!externalGameId || typeof externalGameId !== 'string') {
      return badRequest('externalGameId is required')
    }
    if (!sport || typeof sport !== 'string') {
      return badRequest('sport is required')
    }
    if (!team || typeof team !== 'string') {
      return badRequest('team is required')
    }
    if (side !== 'home' && side !== 'away') {
      return badRequest('side must be "home" or "away"')
    }
    if (condition !== 'above' && condition !== 'below') {
      return badRequest('condition must be "above" or "below"')
    }
    if (typeof threshold !== 'number') {
      return badRequest('threshold must be a number')
    }

    if (market && !validMarkets.includes(market)) {
      return badRequest('market must be one of: moneyline, spreads, totals')
    }

    const alert = await createAlert({
      userId: user.id,
      externalGameId,
      sport,
      team,
      side,
      market: (market as 'moneyline' | 'spreads' | 'totals') ?? 'moneyline',
      condition,
      threshold,
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      )
    }

    return NextResponse.json(alert, { status: 201 })
  })
}

export async function DELETE(request: Request) {
  return withAuthenticatedRoute(request, 'delete-alert', async ({ user }) => {
    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('id')

    if (!alertId) {
      return badRequest('id query parameter is required')
    }

    const success = await deleteAlert(alertId, user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete alert' },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted: true })
  })
}
