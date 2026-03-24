'use client'

import { useMemo } from 'react'
import {
  calculateUsageForecast,
  getStatusColor,
  getStatusBg,
  type UsageForecast,
} from '@/lib/api-usage-forecast'

interface ApiUsageForecastProps {
  usedRequests: number
  monthlyBudget?: number
}

export function ApiUsageForecastPanel({
  usedRequests,
  monthlyBudget = 500,
}: ApiUsageForecastProps) {
  const forecast = useMemo(
    () => calculateUsageForecast(usedRequests, monthlyBudget),
    [usedRequests, monthlyBudget]
  )

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`rounded-lg border p-4 ${getStatusBg(forecast.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-semibold ${getStatusColor(forecast.status)}`}>
              {forecast.status === 'safe' && 'Budget Healthy'}
              {forecast.status === 'warning' && 'Budget Warning'}
              {forecast.status === 'danger' && 'Budget Critical'}
              {forecast.status === 'exhausted' && 'Budget Exhausted'}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {forecast.usedRequests} / {forecast.monthlyBudget} requests used ({forecast.usedPercentage}%)
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{forecast.remainingRequests}</div>
            <div className="text-xs text-zinc-400">remaining</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              forecast.status === 'safe' ? 'bg-green-500' :
              forecast.status === 'warning' ? 'bg-amber-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(forecast.usedPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Daily Burn Rate"
          value={`${forecast.dailyBurnRate}/day`}
          subtext={`${forecast.daysElapsed} days elapsed`}
        />
        <MetricCard
          label="Projected Month End"
          value={`${forecast.projectedMonthEnd}`}
          subtext={forecast.projectedMonthEnd > forecast.monthlyBudget ? 'Over budget' : 'Within budget'}
          color={forecast.projectedMonthEnd > forecast.monthlyBudget ? 'text-red-400' : 'text-green-400'}
        />
        <MetricCard
          label="Sustainable Rate"
          value={`${forecast.recommendedDailyBudget}/day`}
          subtext={`${forecast.daysRemaining} days left`}
        />
        <MetricCard
          label={forecast.willExhaust ? 'Exhaustion In' : 'Exhaustion'}
          value={
            forecast.willExhaust
              ? forecast.daysUntilExhaustion === 0
                ? 'Now'
                : `${forecast.daysUntilExhaustion}d`
              : 'No'
          }
          subtext={forecast.exhaustionDate || 'Will not exhaust'}
          color={forecast.willExhaust ? 'text-red-400' : 'text-green-400'}
        />
      </div>

      {/* Suggestions */}
      {forecast.suggestions.length > 0 && (
        <div className="rounded-lg border border-border bg-zinc-900 p-3">
          <div className="text-xs font-medium text-zinc-400 mb-2">Recommendations</div>
          <ul className="space-y-1">
            {forecast.suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                <span className="text-zinc-500 mt-0.5">&#8226;</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Budget breakdown */}
      <div className="rounded-lg border border-border bg-zinc-900 p-3">
        <div className="text-xs font-medium text-zinc-400 mb-2">Budget Breakdown</div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-zinc-500">4 sports &times; 1 call</span>
            <div className="font-medium">= 4 calls/refresh</div>
          </div>
          <div>
            <span className="text-zinc-500">5 min cache TTL</span>
            <div className="font-medium">= 12 refreshes/hr</div>
          </div>
          <div>
            <span className="text-zinc-500">48 calls/hr max</span>
            <div className="font-medium">~10 hrs/month</div>
          </div>
          <div>
            <span className="text-zinc-500">Selective refresh</span>
            <div className="font-medium">extends budget</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtext,
  color = 'text-zinc-100',
}: {
  label: string
  value: string
  subtext: string
  color?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-zinc-900 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500">{subtext}</div>
    </div>
  )
}
