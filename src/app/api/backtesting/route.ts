import { NextResponse } from 'next/server'
import { withAuthenticatedRoute, badRequest } from '@/lib/api/route-handler'
import { runBacktest } from '@/lib/backtesting'
import type { BacktestConfig } from '@/lib/backtesting'

const VALID_SPORTS = ['nba', 'nfl', 'mlb', 'nhl']
const VALID_SEASONS = ['2023-24', '2024-25']
const VALID_STRATEGIES = ['smart-signals', 'high-confidence', 'value-plays']

export async function POST(request: Request): Promise<Response> {
  return withAuthenticatedRoute(request, 'backtesting', async ({ request: req }) => {
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return badRequest('Invalid request body')
    }

    const { sport, season, strategy, unitSize, startingBankroll } = body as Record<string, unknown>

    if (typeof sport !== 'string' || !VALID_SPORTS.includes(sport.toLowerCase())) {
      return badRequest(`Invalid sport. Must be one of: ${VALID_SPORTS.join(', ')}`)
    }

    if (typeof season !== 'string' || !VALID_SEASONS.includes(season)) {
      return badRequest(`Invalid season. Must be one of: ${VALID_SEASONS.join(', ')}`)
    }

    if (typeof strategy !== 'string' || !VALID_STRATEGIES.includes(strategy)) {
      return badRequest(`Invalid strategy. Must be one of: ${VALID_STRATEGIES.join(', ')}`)
    }

    const parsedUnitSize = Number(unitSize)
    if (!Number.isFinite(parsedUnitSize) || parsedUnitSize < 1 || parsedUnitSize > 10000) {
      return badRequest('Unit size must be between $1 and $10,000')
    }

    const parsedBankroll = Number(startingBankroll)
    if (!Number.isFinite(parsedBankroll) || parsedBankroll < 100 || parsedBankroll > 1000000) {
      return badRequest('Starting bankroll must be between $100 and $1,000,000')
    }

    const config: BacktestConfig = {
      sport: sport.toLowerCase(),
      season,
      strategy: strategy as BacktestConfig['strategy'],
      unitSize: parsedUnitSize,
      startingBankroll: parsedBankroll,
    }

    const result = runBacktest(config)

    return NextResponse.json(result)
  })
}
