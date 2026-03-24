'use client'

import { useState, useEffect } from 'react'
import {
  buildSeasonalTrends,
  getWeeklyTrendDirection,
  type SeasonalTrendsResult,
} from '@/lib/seasonal-trends'

function ROICell({ roi }: { roi: number }) {
  return (
    <span className={roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>
      {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
    </span>
  )
}

function MonthBar({ monthName, roi, maxAbsROI }: { monthName: string; roi: number; maxAbsROI: number }) {
  const width = maxAbsROI > 0 ? (Math.abs(roi) / maxAbsROI) * 100 : 0
  const isPositive = roi >= 0

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400 w-16 shrink-0 text-right">{monthName.slice(0, 3)}</span>
      <div className="flex-1 h-5 relative">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700" />
        {/* Bar */}
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-sm transition-all ${
            isPositive ? 'bg-emerald-500/60 left-1/2' : 'bg-red-500/60 right-1/2'
          }`}
          style={{
            width: `${width / 2}%`,
            ...(isPositive ? {} : { right: '50%' }),
          }}
        />
      </div>
      <span className="text-xs w-14 text-right">
        <ROICell roi={roi} />
      </span>
    </div>
  )
}

function PatternCard({ description, strength, evidence }: {
  description: string
  strength: number
  evidence: string
}) {
  const color =
    strength >= 70 ? 'border-emerald-500/30 bg-emerald-500/5' :
    strength >= 40 ? 'border-amber-500/30 bg-amber-500/5' :
    'border-zinc-700 bg-zinc-800/50'

  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-sm text-zinc-300">{description}</p>
      <p className="text-xs text-zinc-500 mt-1">{evidence}</p>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${strength}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-500">{strength.toFixed(0)}%</span>
      </div>
    </div>
  )
}

export function SeasonalTrendsPanel() {
  const [result, setResult] = useState<SeasonalTrendsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'monthly' | 'weekly' | 'day'>('monthly')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('betbrain_picks')
      if (!raw) {
        setLoading(false)
        return
      }
      const picks = JSON.parse(raw)
      setResult(buildSeasonalTrends(picks))
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!result || (result.monthly.length === 0 && result.dayOfWeek.length === 0)) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
        <p className="text-sm text-zinc-400">
          {result?.summary || 'Need dated picks to detect seasonal trends. Log picks with dates to see calendar-based patterns.'}
        </p>
      </div>
    )
  }

  const maxAbsROI = Math.max(...result.monthly.map((m) => Math.abs(m.roi)), 1)
  const weeklyTrend = getWeeklyTrendDirection(result.weekly)

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {result.bestMonth && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Best Month</p>
            <p className="text-lg font-bold text-emerald-400">{result.bestMonth.monthName}</p>
            <p className="text-xs text-zinc-500">{result.bestMonth.roi.toFixed(1)}% ROI</p>
          </div>
        )}
        {result.worstMonth && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Worst Month</p>
            <p className="text-lg font-bold text-red-400">{result.worstMonth.monthName}</p>
            <p className="text-xs text-zinc-500">{result.worstMonth.roi.toFixed(1)}% ROI</p>
          </div>
        )}
        {result.bestDay && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Best Day</p>
            <p className="text-lg font-bold text-emerald-400">{result.bestDay.dayName}</p>
            <p className="text-xs text-zinc-500">{result.bestDay.roi.toFixed(1)}% ROI</p>
          </div>
        )}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Weekly Trend</p>
          <p className={`text-lg font-bold capitalize ${
            weeklyTrend === 'improving' ? 'text-emerald-400' :
            weeklyTrend === 'declining' ? 'text-red-400' :
            'text-zinc-400'
          }`}>
            {weeklyTrend}
          </p>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 w-fit">
        {([['monthly', 'Monthly'], ['day', 'Day of Week'], ['weekly', 'Weekly']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              view === key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Monthly view */}
      {view === 'monthly' && (
        <div className="space-y-1.5">
          {result.monthly.map((m) => (
            <MonthBar key={m.month} monthName={m.monthName} roi={m.roi} maxAbsROI={maxAbsROI} />
          ))}
        </div>
      )}

      {/* Day of week view */}
      {view === 'day' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-500 py-2">Day</th>
                <th className="text-right text-zinc-500 py-2">W</th>
                <th className="text-right text-zinc-500 py-2">L</th>
                <th className="text-right text-zinc-500 py-2">Win %</th>
                <th className="text-right text-zinc-500 py-2">ROI</th>
              </tr>
            </thead>
            <tbody>
              {result.dayOfWeek.map((d) => (
                <tr key={d.day} className="border-b border-zinc-800/50">
                  <td className="py-1.5 text-zinc-300">{d.dayName}</td>
                  <td className="text-right text-zinc-400">{d.wins}</td>
                  <td className="text-right text-zinc-400">{d.losses}</td>
                  <td className="text-right">
                    {d.winRate !== null ? <ROICell roi={d.winRate - 50} /> : <span className="text-zinc-600">-</span>}
                  </td>
                  <td className="text-right"><ROICell roi={d.roi} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Weekly view */}
      {view === 'weekly' && (
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-500 py-2">Week</th>
                <th className="text-right text-zinc-500 py-2">W-L</th>
                <th className="text-right text-zinc-500 py-2">Profit</th>
                <th className="text-right text-zinc-500 py-2">ROI</th>
              </tr>
            </thead>
            <tbody>
              {[...result.weekly].reverse().map((w) => (
                <tr key={w.label} className="border-b border-zinc-800/50">
                  <td className="py-1.5 text-zinc-300">{w.label}</td>
                  <td className="text-right text-zinc-400">{w.wins}-{w.losses}</td>
                  <td className={`text-right ${w.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {w.profit >= 0 ? '+' : ''}{w.profit.toFixed(0)}
                  </td>
                  <td className="text-right"><ROICell roi={w.roi} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Patterns */}
      {result.patterns.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Detected Patterns</h4>
          {result.patterns.map((p, i) => (
            <PatternCard key={i} {...p} />
          ))}
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded px-3 py-2">
        {result.summary}
      </p>
    </div>
  )
}
