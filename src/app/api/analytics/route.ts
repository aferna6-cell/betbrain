import { NextResponse } from 'next/server'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { getUserAnalytics } from '@/lib/analytics'

export async function GET(request: Request) {
  return withAuthenticatedRoute(request, 'analytics', async ({ user }) => {
    const analytics = await getUserAnalytics(user.id)
    return NextResponse.json(analytics)
  })
}
