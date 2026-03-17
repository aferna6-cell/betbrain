import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getUserAnalytics } from '@/lib/analytics'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Analytics — BetBrain',
  description: 'Your performance metrics, pick breakdowns, and activity summary.',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const analytics = await getUserAnalytics(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Your pick performance, activity metrics, and API usage at a glance.
        </p>
      </div>

      <AnalyticsDashboard data={analytics} />
    </div>
  )
}
