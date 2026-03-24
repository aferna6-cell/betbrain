'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  aggregateDailyPnL,
  buildCalendarMonth,
  getHeatLevel,
  getHeatColor,
  getMonthLabel,
  getStreakInfo,
  type DailyPnL,
  type CalendarMonth,
} from '@/lib/profit-calendar'
import type { BankrollConfig } from '@/lib/bankroll'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PickForCalendar {
  game_date: string
  outcome: string | null
  profit: number | null
  units: number
}

function loadBankrollConfig(): BankrollConfig {
  if (typeof window === 'undefined') return { startingBalance: 1000, unitSize: 10 }
  try {
    const stored = localStorage.getItem('betbrain-bankroll-config')
    if (stored) return JSON.parse(stored) as BankrollConfig
  } catch {
    // ignore
  }
  return { startingBalance: 1000, unitSize: 10 }
}

function loadPicks(): PickForCalendar[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('betbrain-picks')
    if (stored) return JSON.parse(stored) as PickForCalendar[]
  } catch {
    // ignore
  }
  return []
}

export function ProfitCalendar() {
  const [picks, setPicks] = useState<PickForCalendar[]>([])
  const [config, setConfig] = useState<BankrollConfig>({ startingBalance: 1000, unitSize: 10 })
  const [selectedDay, setSelectedDay] = useState<DailyPnL | null>(null)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    setPicks(loadPicks())
    setConfig(loadBankrollConfig())
  }, [])

  const dailyPnL = useMemo(() => aggregateDailyPnL(picks), [picks])
  const calendarData = useMemo(
    () => buildCalendarMonth(viewYear, viewMonth, dailyPnL),
    [viewYear, viewMonth, dailyPnL]
  )
  const streakInfo = useMemo(() => getStreakInfo(dailyPnL), [dailyPnL])

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
    setSelectedDay(null)
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
    setSelectedDay(null)
  }

  function goToToday() {
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setSelectedDay(null)
  }

  // Determine how many rows we actually need (hide trailing empty rows)
  const lastFilledIndex = calendarData.days.reduce(
    (max, day, idx) => (day !== null || idx < new Date(viewYear, viewMonth + 1, 0).getDate() + new Date(viewYear, viewMonth, 1).getDay() ? idx : max),
    0
  )
  const rowsNeeded = Math.ceil((lastFilledIndex + 1) / 7)
  const visibleSlots = rowsNeeded * 7

  // Calculate which day numbers to show (even without P/L data)
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  return (
    <div className="space-y-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            &larr;
          </button>
          <h3 className="text-lg font-bold min-w-[200px] text-center">
            {getMonthLabel(viewYear, viewMonth)}
          </h3>
          <button
            onClick={goToNextMonth}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            &rarr;
          </button>
        </div>
        <button
          onClick={goToToday}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Monthly P/L"
          value={formatProfit(calendarData.totalProfit)}
          color={calendarData.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          label="Win/Lose Days"
          value={`${calendarData.winningDays}W / ${calendarData.losingDays}L`}
          color="text-zinc-300"
        />
        <StatCard
          label="Active Days"
          value={`${calendarData.activeDays}`}
          color="text-zinc-300"
        />
        <StatCard
          label="Day Streak"
          value={
            streakInfo.currentStreak > 0
              ? `${streakInfo.currentStreak}W`
              : streakInfo.currentStreak < 0
                ? `${Math.abs(streakInfo.currentStreak)}L`
                : '0'
          }
          color={
            streakInfo.currentStreak > 0
              ? 'text-green-400'
              : streakInfo.currentStreak < 0
                ? 'text-red-400'
                : 'text-zinc-400'
          }
        />
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 bg-zinc-900">
          {DAY_LABELS.map((day) => (
            <div
              key={day}
              className="px-1 py-2 text-center text-xs font-medium text-zinc-400 border-b border-border"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarData.days.slice(0, visibleSlots).map((pnl, idx) => {
            const dayNum = idx - firstDayOfWeek + 1
            const isValidDay = dayNum >= 1 && dayNum <= daysInMonth
            const isToday =
              isValidDay &&
              viewYear === now.getFullYear() &&
              viewMonth === now.getMonth() &&
              dayNum === now.getDate()

            const heatLevel = pnl ? getHeatLevel(pnl.profit, config.unitSize) : 'no-activity'
            const heatColor = isValidDay ? getHeatColor(heatLevel) : ''

            return (
              <button
                key={idx}
                onClick={() => pnl && setSelectedDay(pnl)}
                disabled={!pnl}
                className={`
                  relative min-h-[60px] sm:min-h-[72px] p-1 border-b border-r border-border
                  transition-all duration-150
                  ${isValidDay ? 'cursor-pointer hover:ring-1 hover:ring-zinc-500' : 'cursor-default'}
                  ${pnl ? heatColor : isValidDay ? 'bg-zinc-900/30' : 'bg-zinc-950/50'}
                  ${selectedDay?.date === pnl?.date ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                {isValidDay && (
                  <>
                    <span
                      className={`
                        text-xs font-medium
                        ${isToday ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}
                      `}
                    >
                      {dayNum}
                    </span>
                    {pnl && (
                      <div className="mt-0.5">
                        <span className={`text-xs font-bold ${pnl.profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                          {pnl.profit >= 0 ? '+' : ''}{pnl.profit.toFixed(1)}u
                        </span>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {pnl.wins}W-{pnl.losses}L
                        </div>
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
        <span>Legend:</span>
        {[
          { level: 'big-loss' as const, label: 'Big loss' },
          { level: 'loss' as const, label: 'Loss' },
          { level: 'small-loss' as const, label: 'Small loss' },
          { level: 'break-even' as const, label: 'Break even' },
          { level: 'small-win' as const, label: 'Small win' },
          { level: 'win' as const, label: 'Win' },
          { level: 'big-win' as const, label: 'Big win' },
        ].map(({ level, label }) => (
          <div key={level} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${getHeatColor(level)}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && <DayDetail day={selectedDay} unitSize={config.unitSize} onClose={() => setSelectedDay(null)} />}

      {/* Best/Worst day summary */}
      {calendarData.activeDays > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {calendarData.bestDay && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <div className="text-xs text-green-400 font-medium">Best Day</div>
              <div className="text-lg font-bold text-green-300">
                +{calendarData.bestDay.profit.toFixed(2)}u
              </div>
              <div className="text-xs text-zinc-400">
                {formatDate(calendarData.bestDay.date)} &middot; {calendarData.bestDay.wins}W-{calendarData.bestDay.losses}L
              </div>
            </div>
          )}
          {calendarData.worstDay && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <div className="text-xs text-red-400 font-medium">Worst Day</div>
              <div className="text-lg font-bold text-red-300">
                {calendarData.worstDay.profit.toFixed(2)}u
              </div>
              <div className="text-xs text-zinc-400">
                {formatDate(calendarData.worstDay.date)} &middot; {calendarData.worstDay.wins}W-{calendarData.worstDay.losses}L
              </div>
            </div>
          )}
        </div>
      )}

      {calendarData.activeDays === 0 && (
        <div className="text-center py-8 text-zinc-500">
          No resolved picks for {getMonthLabel(viewYear, viewMonth)}.
          <br />
          <span className="text-sm">Log picks in the Picks Tracker to see your profit calendar.</span>
        </div>
      )}
    </div>
  )
}

function DayDetail({
  day,
  unitSize,
  onClose,
}: {
  day: DailyPnL
  unitSize: number
  onClose: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold">{formatDate(day.date)}</h4>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 text-sm"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-zinc-400">P/L</div>
          <div className={`text-lg font-bold ${day.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {day.profit >= 0 ? '+' : ''}{day.profit.toFixed(2)}u
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Record</div>
          <div className="text-lg font-bold">
            {day.wins}W-{day.losses}L{day.pushes > 0 ? `-${day.pushes}P` : ''}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Units Wagered</div>
          <div className="text-lg font-bold">{day.units.toFixed(1)}u</div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">ROI</div>
          <div className={`text-lg font-bold ${day.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {day.roi >= 0 ? '+' : ''}{day.roi.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-zinc-900 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

function formatProfit(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}u`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
