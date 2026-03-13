import { createClient } from '@/lib/supabase/server'
import { getAllOdds, getOddsApiUsage } from '@/lib/sports/odds'
import { GamesDashboard } from '@/components/games-dashboard'
import type { Database } from '@/lib/supabase/types'
import type { NormalizedGame } from '@/lib/sports/config'

type Profile = Database['public']['Tables']['profiles']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').single()
  const profile = data as Profile | null

  // Fetch odds for all sports and API usage in parallel
  const [oddsMap, apiUsage] = await Promise.all([
    getAllOdds(),
    getOddsApiUsage(),
  ])

  // Build the serializable data structure for the client component
  const gamesBySport: Record<string, NormalizedGame[]> = {}
  const dataNotices: string[] = []

  for (const [sport, result] of oddsMap) {
    gamesBySport[sport] = result.games
    if (result.dataNotice) {
      dataNotices.push(result.dataNotice)
    }
  }

  const totalGames = Object.values(gamesBySport).flat().length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {profile?.display_name
            ? `Welcome back, ${profile.display_name}`
            : 'Dashboard'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your AI-powered sports analytics overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Subscription</p>
          <p className="mt-1 text-2xl font-semibold capitalize">
            {profile?.subscription_tier ?? 'Free'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Analyses Today</p>
          <p className="mt-1 text-2xl font-semibold">
            {profile?.analyses_today ?? 0}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}/ {profile?.subscription_tier === 'pro' ? '\u221E' : '3'}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Games Today</p>
          <p className="mt-1 text-2xl font-semibold">{totalGames}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-1 text-lg font-medium text-green-500">Active</p>
        </div>
      </div>

      <GamesDashboard
        gamesBySport={gamesBySport}
        apiUsage={apiUsage}
        dataNotices={dataNotices}
      />
    </div>
  )
}
