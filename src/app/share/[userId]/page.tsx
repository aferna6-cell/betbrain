import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getShareableStats } from '@/lib/share-stats'
import { SPORT_LABELS } from '@/lib/sports/config'
import { profitColor } from '@/lib/format'

interface PageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params
  const stats = await getShareableStats(userId)
  if (!stats) return { title: 'Not Found — BetBrain' }

  const record = `${stats.record.wins}W-${stats.record.losses}L${stats.record.pushes > 0 ? `-${stats.record.pushes}P` : ''}`

  return {
    title: `${stats.displayName} — ${record} | BetBrain`,
    description: `${stats.displayName}'s pick record on BetBrain: ${record}, ${stats.roi > 0 ? '+' : ''}${stats.roi}% ROI`,
    openGraph: {
      title: `${stats.displayName} — ${record}`,
      description: `ROI: ${stats.roi > 0 ? '+' : ''}${stats.roi}% | Win Rate: ${stats.winRate ?? '--'}% | Tracked on BetBrain`,
      type: 'profile',
    },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { userId } = await params
  const stats = await getShareableStats(userId)

  if (!stats) {
    notFound()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Stats Card */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {/* Header accent */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400" />

          <div className="p-6">
            {/* Name + badge */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{stats.displayName}</h1>
                <p className="text-xs text-muted-foreground">Member since {stats.memberSince}</p>
              </div>
              <div className="rounded-md bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400">
                BetBrain
              </div>
            </div>

            {/* Record */}
            <div className="mb-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-green-500">{stats.record.wins}</span>
              <span className="text-xl text-muted-foreground">-</span>
              <span className="text-4xl font-bold text-red-500">{stats.record.losses}</span>
              {stats.record.pushes > 0 && (
                <>
                  <span className="text-xl text-muted-foreground">-</span>
                  <span className="text-4xl font-bold text-muted-foreground">{stats.record.pushes}</span>
                </>
              )}
              <span className="ml-2 text-sm text-muted-foreground">
                {stats.total} total picks
              </span>
            </div>

            {/* Key metrics */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="mt-1 text-xl font-bold">
                  {stats.winRate !== null ? `${stats.winRate}%` : '--'}
                </p>
              </div>
              <div className="rounded-md border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className={`mt-1 text-xl font-bold ${profitColor(stats.roi)}`}>
                  {stats.roi > 0 ? '+' : ''}{stats.roi}%
                </p>
              </div>
              <div className="rounded-md border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className={`mt-1 text-xl font-bold ${profitColor(stats.totalProfit)}`}>
                  {stats.totalProfit > 0 ? '+' : ''}{stats.totalProfit}u
                </p>
              </div>
            </div>

            {/* CLV */}
            {stats.clv && (
              <div className="mb-4 rounded-md bg-blue-500/10 px-4 py-3">
                <p className="text-xs font-medium text-blue-400">Closing Line Value</p>
                <div className="mt-1 flex items-center gap-4">
                  <span className={`text-lg font-bold ${profitColor(stats.clv.averageCLV)}`}>
                    {stats.clv.averageCLV > 0 ? '+' : ''}{stats.clv.averageCLV}% avg
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stats.clv.positiveCLVRate}% +CLV rate
                  </span>
                </div>
              </div>
            )}

            {/* Favorite sport + top sport */}
            <div className="flex items-center justify-between text-sm">
              {stats.favoriteSport && (
                <span className="text-muted-foreground">
                  Favorite:{' '}
                  <span className="font-medium text-foreground uppercase">
                    {SPORT_LABELS[stats.favoriteSport] ?? stats.favoriteSport}
                  </span>
                </span>
              )}
              {stats.topSport && stats.topSport.roi > 0 && (
                <span className="text-muted-foreground">
                  Best:{' '}
                  <span className="font-medium text-green-500 uppercase">
                    {SPORT_LABELS[stats.topSport.sport as keyof typeof SPORT_LABELS] ?? stats.topSport.sport}
                  </span>
                  {' '}+{stats.topSport.roi}%
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/30 px-6 py-3">
            <p className="text-center text-xs text-muted-foreground">
              Tracked on{' '}
              <Link href="/" className="font-medium text-indigo-400 hover:underline">
                BetBrain
              </Link>
              {' '}— AI-powered sports analytics
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-md bg-indigo-500 px-6 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            Start tracking your picks
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          For informational purposes only. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  )
}
