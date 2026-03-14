import { NextResponse } from 'next/server'
import { badRequest, withAuthenticatedRoute } from '@/lib/api/route-handler'
import { checkAnalysisLimit, AnalysisLimitError } from '@/lib/ai/analysis'
import { analyzeParlay } from '@/lib/ai/parlay-analyzer'
import type { ParlayLeg } from '@/lib/ai/parlay-analyzer'

export async function POST(request: Request) {
  return withAuthenticatedRoute(
    request,
    'parlay-analysis',
    async ({ user }) => {
      let body: { legs?: ParlayLeg[] }
      try {
        body = await request.json()
      } catch {
        return badRequest('Invalid JSON body')
      }

      const { legs } = body

      if (!Array.isArray(legs) || legs.length < 2) {
        return badRequest('A parlay requires at least 2 legs')
      }

      if (legs.length > 10) {
        return badRequest('Maximum 10 legs per parlay')
      }

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i]
        if (!leg.description || typeof leg.description !== 'string') {
          return badRequest(`Leg ${i + 1}: description is required`)
        }
        if (typeof leg.odds !== 'number') {
          return badRequest(`Leg ${i + 1}: odds must be a number`)
        }
        if (!leg.sport || typeof leg.sport !== 'string') {
          return badRequest(`Leg ${i + 1}: sport is required`)
        }
      }

      // Check free tier limit
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

      const analysis = await analyzeParlay(legs)
      return NextResponse.json(analysis)
    }
  )
}
