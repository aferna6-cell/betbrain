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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }

    const { externalGameId, sport, team, side, condition, threshold } = body

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

    const alert = await createAlert({
      userId: user.id,
      externalGameId,
      sport,
      team,
      side,
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
