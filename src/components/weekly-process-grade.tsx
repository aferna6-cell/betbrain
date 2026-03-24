'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  buildWeeklyGradeReport,
  type GradedPickForWeekly,
  type WeekGradeSummary,
} from '@/lib/weekly-process-grade'
import { autoGradeAllPicks, type PickForAutoGrade } from '@/lib/auto-grade'

export function WeeklyProcessGradePanel() {
  const [picks, setPicks] = useState<PickForAutoGrade[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  const report = useMemo(() => {
    const resolved = picks.filter(
      (p) => p.outcome === 'win' || p.outcome === 'loss'
    )
    if (resolved.length === 0) return buildWeeklyGradeReport([])

    const graded = autoGradeAllPicks(resolved)
    const gradedPicks: GradedPickForWeekly[] = graded.map((g) => {
      const pick = resolved.find((p) => p.id === g.pickId)
      return {
        game_date: pick?.game_date || '',
        score: g.grade.score,
        grade: g.grade.grade,
        isChaseBet: g.inferred.isChaseBet,
        beatClosingLine: g.inferred.beatClosingLine,
      }
    })
    return buildWeeklyGradeReport(gradedPicks)
  }, [picks])

  if (report.weeks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Weekly Process Grade</h3>
        <p className="text-sm text-muted-foreground">
          Log resolved picks to see weekly process grade trends.
        </p>
      </div>
    )
  }

  const trendColors = {
    improving: 'text-green-400',
    declining: 'text-red-400',
    stable: 'text-blue-400',
    insufficient: 'text-zinc-400',
  }

  const trendLabels = {
    improving: 'Improving',
    declining: 'Declining',
    stable: 'Stable',
    insufficient: 'Need more data',
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Weekly Process Grade</h3>
        <p className="text-sm text-muted-foreground">
          How your betting process quality changes week over week.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-2xl font-bold">{report.overallAvg}</div>
          <div className="text-xs text-muted-foreground">Overall Avg</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className={`text-2xl font-bold ${trendColors[report.trend]}`}>
            {trendLabels[report.trend]}
          </div>
          <div className="text-xs text-muted-foreground">Trend</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-2xl font-bold">{report.weeks.length}</div>
          <div className="text-xs text-muted-foreground">Weeks</div>
        </div>
      </div>

      {/* Best/worst week */}
      {report.bestWeek && report.worstWeek && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3">
            <div className="text-xs text-muted-foreground">Best Week</div>
            <div className="text-lg font-bold text-green-400">{report.bestWeek.avgScore}</div>
            <div className="text-xs text-muted-foreground">{report.bestWeek.weekLabel}</div>
          </div>
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
            <div className="text-xs text-muted-foreground">Worst Week</div>
            <div className="text-lg font-bold text-red-400">{report.worstWeek.avgScore}</div>
            <div className="text-xs text-muted-foreground">{report.worstWeek.weekLabel}</div>
          </div>
        </div>
      )}

      {/* Weekly scores as bar chart */}
      <div className="space-y-1">
        <div className="text-sm font-medium mb-2">Week by Week</div>
        {report.weeks.map((week) => (
          <WeekBar key={week.weekStart} week={week} maxScore={100} />
        ))}
      </div>
    </div>
  )
}

function WeekBar({
  week,
  maxScore,
}: {
  week: WeekGradeSummary
  maxScore: number
}) {
  const pct = Math.round((week.avgScore / maxScore) * 100)
  const color =
    week.avgScore >= 80
      ? 'bg-green-500'
      : week.avgScore >= 65
        ? 'bg-blue-500'
        : week.avgScore >= 50
          ? 'bg-amber-500'
          : 'bg-red-500'

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-24 text-muted-foreground shrink-0 truncate">
        {week.weekLabel}
      </div>
      <div className="flex-1 h-5 rounded bg-muted/30 overflow-hidden relative">
        <div
          className={`h-full rounded ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold">
          {week.avgScore}
        </span>
      </div>
      <div className="w-12 text-right text-muted-foreground">
        {week.pickCount}p
        {week.chaseBets > 0 && (
          <span className="text-amber-400 ml-1">{week.chaseBets}c</span>
        )}
      </div>
    </div>
  )
}
