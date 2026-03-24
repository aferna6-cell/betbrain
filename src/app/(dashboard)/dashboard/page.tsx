import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard — BetBrain',
  description: "View today's games, odds, and AI-powered analysis across NBA, NFL, MLB, NHL.",
}

export const revalidate = 300 // Rebuild every 5 minutes
import { getAllOdds, getOddsApiUsage } from '@/lib/sports/odds'
import { scanForEV } from '@/lib/ev-scanner'
import { analyzeAllConsensus } from '@/lib/consensus'
import { detectSmartSignals } from '@/lib/signals'
import { predictAllGameScripts } from '@/lib/game-script'
import { buildDailySlate } from '@/lib/daily-slate'
import { GamesDashboard } from '@/components/games-dashboard'
import { DashboardStats } from '@/components/dashboard-stats'
import { DailySummary } from '@/components/daily-summary'
import { DailySlateWidget } from '@/components/daily-slate'
import { OnboardingChecklist } from '@/components/onboarding-checklist'
import { WhatsNew } from '@/components/whats-new'
import { TodaysAction } from '@/components/todays-action'
import { BankrollSparkline } from '@/components/bankroll-sparkline'
import { ValuePlaysWidget } from '@/components/value-plays'
import { DailyReviewPrompt } from '@/components/daily-review'
import { TermTooltip } from '@/components/term-tooltip'
import { ResultsFeed } from '@/components/results-feed'
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
  const allGames = Object.values(gamesBySport).flat()

  // Run lightweight analysis on cached data (no API calls)
  const [evResult, consensus, signals] = await Promise.all([
    Promise.resolve(scanForEV(allGames)),
    Promise.resolve(analyzeAllConsensus(allGames)),
    detectSmartSignals(allGames),
  ])

  const divergences = consensus.filter((c) => c.divergence)
  const gameScripts = predictAllGameScripts(allGames)
  const dailySlate = buildDailySlate(allGames, evResult.opportunities, gameScripts)

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

      <OnboardingChecklist />
      <WhatsNew />

      <DailySummary
        evCount={evResult.opportunities.length}
        topEV={evResult.opportunities[0] ?? null}
        divergenceCount={divergences.length}
        topDivergence={divergences[0] ?? null}
        signalCount={signals.length}
      />

      <DailySlateWidget slate={dailySlate} />

      <DailyReviewPrompt />
      <ResultsFeed games={allGames} />
      <TodaysAction />
      <ValuePlaysWidget games={allGames} />
      <DashboardStats />
      <BankrollSparkline />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Plan</p>
          <p className="mt-1 text-2xl font-semibold">Personal</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground"><TermTooltip term="Analysis">Analyses</TermTooltip> Today</p>
          <p className="mt-1 text-2xl font-semibold">
            {profile?.analyses_today ?? 0}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}/ {'\u221E'}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Games Today</p>
          <p className="mt-1 text-2xl font-semibold">{totalGames}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Odds API</p>
          <p className={`mt-1 text-2xl font-semibold ${
            apiUsage.isExhausted ? 'text-red-500' : apiUsage.isWarning ? 'text-yellow-500' : ''
          }`}>
            {apiUsage.count}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}/ {apiUsage.limit}
            </span>
          </p>
        </div>
      </div>

      <GamesDashboard
        gamesBySport={gamesBySport}
        apiUsage={apiUsage}
        dataNotices={dataNotices}
        evGameIds={evResult.opportunities.map((o) => o.game.id)}
        signalGameIds={signals.map((s) => s.game.id)}
      />
    </div>
  )
}
