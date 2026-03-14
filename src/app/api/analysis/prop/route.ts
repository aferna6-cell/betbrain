import { NextResponse } from 'next/server'
import { badRequest, withAuthenticatedRoute } from '@/lib/api/route-handler'
import { checkAnalysisLimit, AnalysisLimitError } from '@/lib/ai/analysis'
import { analyzeProp } from '@/lib/ai/prop-analyzer'
import type { PropAnalysisInput } from '@/lib/ai/prop-analyzer'

export async function POST(request: Request) {
  return withAuthenticatedRoute(
    request,
    'prop-analysis',
    async ({ user }) => {
      let body: Partial<PropAnalysisInput>
      try {
        body = await request.json()
      } catch {
        return badRequest('Invalid JSON body')
      }

      const { playerName, sport, team, opponent, propMarket, line, overOdds, underOdds } = body

      if (!playerName || typeof playerName !== 'string') {
        return badRequest('Missing required field: playerName')
      }
      if (!sport || typeof sport !== 'string') {
        return badRequest('Missing required field: sport')
      }
      if (!team || typeof team !== 'string') {
        return badRequest('Missing required field: team')
      }
      if (!opponent || typeof opponent !== 'string') {
        return badRequest('Missing required field: opponent')
      }
      if (!propMarket || typeof propMarket !== 'string') {
        return badRequest('Missing required field: propMarket')
      }
      if (typeof line !== 'number') {
        return badRequest('Missing required field: line (number)')
      }
      if (typeof overOdds !== 'number') {
        return badRequest('Missing required field: overOdds (number)')
      }
      if (typeof underOdds !== 'number') {
        return badRequest('Missing required field: underOdds (number)')
      }

      // Check free tier limit (shared with game analysis)
      const limitCheck = await checkAnalysisLimit(user.id)
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: new AnalysisLimitError(limitCheck.used, limitCheck.limit)
              .message,
            used: limitCheck.used,
            limit: limitCheck.limit,
          },
          { status: 429 }
        )
      }

      const analysis = await analyzeProp({
        playerName,
        sport,
        team,
        opponent,
        propMarket,
        line,
        overOdds,
        underOdds,
      })

      return NextResponse.json(analysis)
    }
  )
}
