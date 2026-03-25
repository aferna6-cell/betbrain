'use client'

import { Badge } from '@/components/ui/badge'
import type { CostMetrics, SportEfficiency, OptimizationRecommendation, EfficiencyRating } from '@/lib/api-cost-tracker'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ratingColor(rating: EfficiencyRating): string {
  switch (rating) {
    case 'excellent': return 'text-green-500'
    case 'good': return 'text-blue-400'
    case 'average': return 'text-yellow-500'
    case 'poor': return 'text-orange-500'
    case 'wasteful': return 'text-red-500'
  }
}

function ratingBadge(rating: EfficiencyRating): string {
  switch (rating) {
    case 'excellent': return 'bg-green-500/20 text-green-500'
    case 'good': return 'bg-blue-500/20 text-blue-400'
    case 'average': return 'bg-yellow-500/20 text-yellow-500'
    case 'poor': return 'bg-orange-500/20 text-orange-500'
    case 'wasteful': return 'bg-red-500/20 text-red-500'
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ApiCostTracker({
  metrics,
  sportEfficiency,
  recommendation,
}: {
  metrics: CostMetrics
  sportEfficiency: SportEfficiency[]
  recommendation: OptimizationRecommendation
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">API Cost Per Insight</h3>
          <p className="text-xs text-muted-foreground">{recommendation.summary}</p>
        </div>
        <Badge className={ratingBadge(recommendation.rating)}>
          {recommendation.rating.toUpperCase()}
        </Badge>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded bg-background p-3 text-center">
          <p className="text-2xl font-bold">{metrics.totalCalls}</p>
          <p className="text-xs text-muted-foreground">API Calls</p>
        </div>
        <div className="rounded bg-background p-3 text-center">
          <p className="text-2xl font-bold text-green-500">{metrics.totalInsights}</p>
          <p className="text-xs text-muted-foreground">Insights</p>
        </div>
        <div className="rounded bg-background p-3 text-center">
          <p className={`text-2xl font-bold ${metrics.callsPerInsight !== null && metrics.callsPerInsight <= 2 ? 'text-green-500' : 'text-yellow-500'}`}>
            {metrics.callsPerInsight !== null ? metrics.callsPerInsight.toFixed(1) : '-'}
          </p>
          <p className="text-xs text-muted-foreground">Calls/Insight</p>
        </div>
        <div className="rounded bg-background p-3 text-center">
          <p className={`text-2xl font-bold ${metrics.cacheHitRate >= 60 ? 'text-green-500' : 'text-yellow-500'}`}>
            {metrics.cacheHitRate}%
          </p>
          <p className="text-xs text-muted-foreground">Cache Hit Rate</p>
        </div>
      </div>

      {/* Waste vs productive */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-green-500"
            style={{ width: `${100 - metrics.wasteRate}%` }}
          />
          <div
            className="h-full bg-red-500/50"
            style={{ width: `${metrics.wasteRate}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-20 text-right">
          {metrics.wasteRate}% waste
        </span>
      </div>

      {/* Insight breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded border border-border p-2 text-center">
          <p className="text-lg font-bold text-green-500">{metrics.totalEVOpps}</p>
          <p className="text-xs text-muted-foreground">+EV Opps</p>
        </div>
        <div className="rounded border border-border p-2 text-center">
          <p className="text-lg font-bold text-blue-400">{metrics.totalSignals}</p>
          <p className="text-xs text-muted-foreground">Signals</p>
        </div>
        <div className="rounded border border-border p-2 text-center">
          <p className="text-lg font-bold text-purple-400">{metrics.totalAlerts}</p>
          <p className="text-xs text-muted-foreground">Alerts</p>
        </div>
      </div>

      {/* Sport efficiency table */}
      {sportEfficiency.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">By Sport</h4>
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-1.5 text-left text-xs font-medium">Sport</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium">Calls</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium">Insights</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium">Per Call</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium">Waste</th>
                </tr>
              </thead>
              <tbody>
                {sportEfficiency.map(s => (
                  <tr key={s.sport} className="border-t border-border">
                    <td className="px-3 py-1.5 font-medium">{s.sport.toUpperCase()}</td>
                    <td className="px-3 py-1.5 text-right">{s.calls}</td>
                    <td className="px-3 py-1.5 text-right">{s.insights}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${
                      s.insightsPerCall >= 2 ? 'text-green-500' :
                      s.insightsPerCall >= 1 ? 'text-yellow-500' :
                      'text-red-400'
                    }`}>
                      {s.insightsPerCall.toFixed(1)}
                    </td>
                    <td className={`px-3 py-1.5 text-right ${
                      s.wasteRate > 50 ? 'text-red-400' : ''
                    }`}>
                      {s.wasteRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Recommendations</h4>
        <div className="flex items-center gap-4 text-sm">
          <span>Budget: <strong>{recommendation.callsRemaining}</strong> calls left</span>
          <span>Optimal: <strong>{recommendation.optimalDailyRate}</strong> calls/day</span>
          <span>{recommendation.daysRemaining} days left in month</span>
        </div>
        <ul className="space-y-1">
          {recommendation.suggestions.map((s, i) => (
            <li key={i} className="text-xs text-muted-foreground">&bull; {s}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground italic">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
