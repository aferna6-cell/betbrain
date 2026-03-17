import { Badge } from '@/components/ui/badge'
import { SPORT_LABELS } from '@/lib/sports/config'
import { profitColor } from '@/lib/format'
import type { AnalyticsData } from '@/lib/analytics'

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { picks, clv, apiUsage, activity } = data

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Pick Performance</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Record"
            value={`${picks.wins}-${picks.losses}-${picks.pushes}`}
            sub={`${picks.total} total, ${picks.pending} pending`}
          />
          <StatCard
            label="Win Rate"
            value={picks.winRate !== null ? `${picks.winRate}%` : '--'}
            sub={`${picks.wins + picks.losses} decided`}
            color={picks.winRate !== null && picks.winRate >= 52 ? 'text-green-500' : ''}
          />
          <StatCard
            label="ROI"
            value={`${picks.roi > 0 ? '+' : ''}${picks.roi}%`}
            color={profitColor(picks.roi)}
          />
          <StatCard
            label="Profit"
            value={`${picks.totalProfit > 0 ? '+' : ''}${picks.totalProfit}u`}
            color={profitColor(picks.totalProfit)}
          />
        </div>
      </section>

      {/* Activity */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Activity</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Picks (Last 7 Days)"
            value={String(activity.recentPicks)}
          />
          <StatCard
            label="AI Analyses Generated"
            value={String(activity.analysesGenerated)}
          />
          <StatCard
            label="Signals Detected"
            value={String(activity.signalsDetected)}
            sub={`${activity.signalsResolved} resolved`}
          />
          <StatCard
            label="Signal Hit Rate"
            value={activity.signalHitRate !== null ? `${activity.signalHitRate}%` : '--'}
            color={activity.signalHitRate !== null && activity.signalHitRate >= 55 ? 'text-green-500' : ''}
          />
        </div>
      </section>

      {/* CLV */}
      {clv.totalPicks > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Closing Line Value</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Average CLV"
              value={`${clv.averageCLV > 0 ? '+' : ''}${clv.averageCLV}%`}
              color={profitColor(clv.averageCLV)}
            />
            <StatCard
              label="Weighted CLV"
              value={`${clv.weightedCLV > 0 ? '+' : ''}${clv.weightedCLV}%`}
              color={profitColor(clv.weightedCLV)}
            />
            <StatCard
              label="+CLV Rate"
              value={`${clv.positiveCLVRate}%`}
              sub={`${clv.positiveCLVCount} of ${clv.totalPicks} picks`}
              color={clv.positiveCLVRate >= 55 ? 'text-green-500' : ''}
            />
            <StatCard
              label="Picks with Closing Odds"
              value={String(clv.totalPicks)}
              sub={`${clv.positiveCLVCount} positive, ${clv.negativeCLVCount} negative`}
            />
          </div>
        </section>
      )}

      {/* Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Sport */}
        {picks.bySport.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">By Sport</h2>
            <div className="space-y-2">
              {picks.bySport.map((s) => (
                <div
                  key={s.sport}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs font-semibold uppercase">
                      {SPORT_LABELS[s.sport as keyof typeof SPORT_LABELS] ?? s.sport.toUpperCase()}
                    </Badge>
                    <span className="text-sm">
                      {s.wins}W - {s.losses}L
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${profitColor(s.roi)}`}>
                    {s.roi > 0 ? '+' : ''}{s.roi}% ROI
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* By Type */}
        {picks.byType.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">By Pick Type</h2>
            <div className="space-y-2">
              {picks.byType.map((t) => (
                <div
                  key={t.type}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {t.type}
                    </Badge>
                    <span className="text-sm">
                      {t.wins}W - {t.losses}L
                      {t.winRate !== null && (
                        <span className="ml-1 text-muted-foreground">({t.winRate}%)</span>
                      )}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${profitColor(t.roi)}`}>
                    {t.roi > 0 ? '+' : ''}{t.roi}% ROI
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* API Usage */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          API Usage — {apiUsage.month}
        </h2>
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <ProgressBar label="The Odds API" value={apiUsage.odds} max={500} />
          <ProgressBar label="balldontlie" value={apiUsage.balldontlie} max={10000} />
          <ProgressBar label="Claude AI" value={apiUsage.claude} max={1000} />
        </div>
      </section>

      {/* Empty State */}
      {picks.total === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">No data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start logging picks and generating analyses to see your performance metrics here.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Past performance does not guarantee future results.
      </p>
    </div>
  )
}
