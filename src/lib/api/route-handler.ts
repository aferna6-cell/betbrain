import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AuthenticatedRouteContext {
  request: Request
  user: User
}

type AuthenticatedRouteHandler = (
  context: AuthenticatedRouteContext
) => Promise<Response>

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function routeErrorResponse(
  context: string,
  error: unknown
): NextResponse {
  console.error(`[api] ${context} failed:`, error)

  return NextResponse.json(
    { error: `${context} failed. Please try again later.` },
    { status: 500 }
  )
}

export async function withAuthenticatedRoute(
  request: Request,
  context: string,
  handler: AuthenticatedRouteHandler
): Promise<Response> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error(`[api] ${context} auth lookup failed:`, error.message)
      return NextResponse.json(
        { error: 'Authentication check failed' },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return await handler({ request, user })
  } catch (error) {
    return routeErrorResponse(context, error)
  }
}
