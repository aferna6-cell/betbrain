'use client'

import { useState, useEffect } from 'react'
import {
  buildDrawdownHeatmap,
  type DrawdownHeatmapResult,
  type DrawdownDay,
} from '@/lib/drawdown-heatmap'

const HEAT_COLORS: Record<string, string> = {
  none: 'bg-emerald-500/20',
  mild: 'bg-amber-500/20',
  moderate: 'bg-amber-500/40',
  significant: 'bg-red-500/30',
  severe: 'bg-red-500/50',
  critical: 'bg-red-500/70',
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function DayCell({ day, onClick }: { day: DrawdownDay | null; onClick?: () => void }) {
  if (!day) {
    return <div className="w-5 h-5 rounded-sm bg-zinc-800/30" />
  }

  return (
    <button
      onClick={onClick}
      className={`w-5 h-5 rounded-sm transition-colors hover:ring-1 hover:ring-zinc-500 ${HEAT_COLORS[day.heatLevel]}`}
      title={`${day.date}: ${day.drawdown.toFixed(1)}% drawdown, P/L: ${day.dailyPL >= 0 ? '+' : ''}${day.dailyPL.toFixed(0)}`}
    />
  )
}

export function DrawdownHeatmapPanel() {
  const [result, setResult] = useState<DrawdownHeatmapResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DrawdownDay | null>(null)
  const [monthIdx, setMonthIdx] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('betbrain_picks')
      const bankrollRaw = localStorage.getItem('betbrain_bankroll_config')
      const startingBankroll = bankrollRaw
        ? JSON.parse(bankrollRaw).startingBalance ?? 1000
        : 1000

      if (!raw) {
        setLoading(false)
        return
      }
      const picks = JSON.parse(raw)
      const r = buildDrawdownHeatmap(picks, startingBankroll)
      setResult(r)
      // Start at last month
      if (r.months.length > 0) setMonthIdx(r.months.length - 1)
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-sm bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!result || result.months.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
        <p className="text-sm text-zinc-400">
          {result?.summary || 'Need resolved picks with dates to show drawdown heatmap.'}
        </p>
      </div>
    )
  }

  const month = result.months[monthIdx]

  // Calculate first day offset (what day of week does day 1 fall on)
  const firstDayOfWeek = new Date(month.year, month.month - 1, 1).getDay()

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Max Drawdown</p>
          <p className={`text-lg font-bold ${result.maxDrawdown > 20 ? 'text-red-400' : result.maxDrawdown > 10 ? 'text-amber-400' : 'text-zinc-300'}`}>
            {result.maxDrawdown.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg Drawdown</p>
          <p className="text-lg font-bold text-zinc-300">{result.avgDrawdown.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Longest Streak</p>
          <p className="text-lg font-bold text-zinc-300">{result.longestDrawdownStreak} days</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Current DD</p>
          <p className={`text-lg font-bold ${result.currentDrawdown > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {result.currentDrawdown.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthIdx(Math.max(0, monthIdx - 1))}
          disabled={monthIdx === 0}
          className="px-2 py-1 text-sm text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          &larr;
        </button>
        <span className="text-sm font-medium text-white">{month.label}</span>
        <button
          onClick={() => setMonthIdx(Math.min(result.months.length - 1, monthIdx + 1))}
          disabled={monthIdx === result.months.length - 1}
          className="px-2 py-1 text-sm text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          &rarr;
        </button>
      </div>

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="w-5 h-4 flex items-center justify-center text-[10px] text-zinc-600">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="w-5 h-5" />
          ))}
          {/* Day cells */}
          {month.days.slice(1).map((day, i) => (
            <DayCell
              key={i}
              day={day}
              onClick={() => day && setSelectedDay(day)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-emerald-500/20" />
        <div className="w-3 h-3 rounded-sm bg-amber-500/20" />
        <div className="w-3 h-3 rounded-sm bg-amber-500/40" />
        <div className="w-3 h-3 rounded-sm bg-red-500/30" />
        <div className="w-3 h-3 rounded-sm bg-red-500/50" />
        <div className="w-3 h-3 rounded-sm bg-red-500/70" />
        <span>More</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-zinc-800/50 rounded p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-400">{selectedDay.date}</span>
            <button onClick={() => setSelectedDay(null)} className="text-zinc-600 hover:text-zinc-400">&times;</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-zinc-500">Drawdown:</span>{' '}
              <span className={selectedDay.drawdown > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {selectedDay.drawdown.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Balance:</span>{' '}
              <span className="text-zinc-300">${selectedDay.balance.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Peak:</span>{' '}
              <span className="text-zinc-300">${selectedDay.peak.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Day P/L:</span>{' '}
              <span className={selectedDay.dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {selectedDay.dailyPL >= 0 ? '+' : ''}{selectedDay.dailyPL.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Month stats */}
      <div className="text-xs text-zinc-500">
        This month: max {month.maxDrawdown.toFixed(1)}% drawdown, avg {month.avgDrawdown.toFixed(1)}%, {month.daysInDrawdown} days in drawdown
      </div>

      {/* Summary */}
      <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded px-3 py-2">
        {result.summary}
      </p>
    </div>
  )
}
