'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  calcExpectedWins,
  calcExpectedWinsBySport,
  getLuckDescription,
  type ExpectedWinsData,
} from '@/lib/expected-wins'

interface PickForChart {
  outcome: string | null
  odds: number
  sport?: string
  created_at?: string
  game_date?: string
}

export function ExpectedWinsChart() {
  const [picks, setPicks] = useState<PickForChart[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch {
      /* empty */
    }
  }, [])

  const data = useMemo(() => calcExpectedWins(picks), [picks])
  const bySport = useMemo(() => calcExpectedWinsBySport(picks), [picks])
  const description = useMemo(() => getLuckDescription(data), [data])

  if (data.totalPicks < 3) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Expected vs Actual Wins</h3>
        <p className="text-sm text-muted-foreground">
          Log at least 3 resolved picks to see how your actual wins compare to
          what the odds predicted.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Expected vs Actual Wins</h3>
        <LuckBadge assessment={data.assessment} />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox
          label="Actual Wins"
          value={data.totalActualWins.toString()}
          color="text-blue-400"
        />
        <StatBox
          label="Expected Wins"
          value={data.totalExpectedWins.toFixed(1)}
          color="text-zinc-400"
        />
        <StatBox
          label="Delta"
          value={`${data.winDelta > 0 ? '+' : ''}${data.winDelta.toFixed(1)}`}
          color={
            data.winDelta > 0
              ? 'text-green-400'
              : data.winDelta < 0
                ? 'text-red-400'
                : 'text-zinc-400'
          }
        />
        <StatBox
          label="Z-Score"
          value={
            data.luckZScore != null ? data.luckZScore.toFixed(2) : '--'
          }
          color={
            data.luckZScore != null
              ? data.luckZScore > 1.5
                ? 'text-green-400'
                : data.luckZScore < -1.5
                  ? 'text-red-400'
                  : 'text-zinc-400'
              : 'text-zinc-400'
          }
        />
      </div>

      {/* SVG Chart */}
      <ExpectedWinsSVG data={data} />

      {/* Description */}
      <p className="text-sm text-muted-foreground">{description}</p>

      {/* By sport breakdown */}
      {bySport.length > 1 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            By Sport
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {bySport.map((s) => (
              <div
                key={s.sport}
                className="flex items-center justify-between px-3 py-2 rounded bg-muted/50 text-xs"
              >
                <span className="uppercase font-medium">{s.sport}</span>
                <div className="flex items-center gap-3">
                  <span>
                    {s.actualWins}W / {s.expectedWins.toFixed(1)}E
                  </span>
                  <span
                    className={
                      s.delta > 0
                        ? 'text-green-400'
                        : s.delta < 0
                          ? 'text-red-400'
                          : 'text-zinc-400'
                    }
                  >
                    {s.delta > 0 ? '+' : ''}
                    {s.delta.toFixed(1)}
                  </span>
                  <LuckBadge assessment={s.assessment} small />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function LuckBadge({
  assessment,
  small,
}: {
  assessment: 'hot' | 'cold' | 'expected'
  small?: boolean
}) {
  const config = {
    hot: { label: 'Running Hot', bg: 'bg-green-500/20', text: 'text-green-400' },
    cold: { label: 'Running Cold', bg: 'bg-red-500/20', text: 'text-red-400' },
    expected: {
      label: 'As Expected',
      bg: 'bg-zinc-500/20',
      text: 'text-zinc-400',
    },
  }
  const c = config[assessment]

  return (
    <span
      className={`${c.bg} ${c.text} ${
        small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      } rounded-full font-medium`}
    >
      {c.label}
    </span>
  )
}

function ExpectedWinsSVG({ data }: { data: ExpectedWinsData }) {
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxWins = Math.max(
    data.actualWins[data.actualWins.length - 1] || 0,
    data.expectedWins[data.expectedWins.length - 1] || 0,
    1
  )
  const maxX = data.labels.length || 1

  const scaleX = (i: number) => padding.left + (i / maxX) * chartW
  const scaleY = (v: number) =>
    padding.top + chartH - (v / (maxWins * 1.1)) * chartH

  const actualPath = data.actualWins
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(v)}`)
    .join(' ')

  const expectedPath = data.expectedWins
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(v)}`)
    .join(' ')

  // Fill between the two lines
  const fillPath =
    actualPath +
    ' ' +
    data.expectedWins
      .map(
        (v, i) =>
          `L${scaleX(data.expectedWins.length - 1 - i)},${scaleY(
            data.expectedWins[data.expectedWins.length - 1 - i]
          )}`
      )
      .join(' ') +
    ' Z'

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding.top + chartH * (1 - pct)
        const val = Math.round(maxWins * 1.1 * pct)
        return (
          <g key={pct}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {val}
            </text>
          </g>
        )
      })}

      {/* X axis label */}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={10}
      >
        Pick # (chronological)
      </text>

      {/* Fill area between lines */}
      {data.actualWins.length > 1 && (
        <path
          d={fillPath}
          fill={data.winDelta >= 0 ? '#22c55e' : '#ef4444'}
          fillOpacity={0.08}
        />
      )}

      {/* Expected line (dashed) */}
      {data.expectedWins.length > 1 && (
        <path
          d={expectedPath}
          fill="none"
          stroke="#71717a"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      )}

      {/* Actual line */}
      {data.actualWins.length > 1 && (
        <path
          d={actualPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
        />
      )}

      {/* Endpoint dots */}
      {data.actualWins.length > 0 && (
        <>
          <circle
            cx={scaleX(data.actualWins.length - 1)}
            cy={scaleY(data.actualWins[data.actualWins.length - 1])}
            r={4}
            fill="#3b82f6"
          />
          <circle
            cx={scaleX(data.expectedWins.length - 1)}
            cy={scaleY(data.expectedWins[data.expectedWins.length - 1])}
            r={4}
            fill="#71717a"
          />
        </>
      )}

      {/* Legend */}
      <g transform={`translate(${padding.left + 10}, ${padding.top})`}>
        <line x1={0} y1={0} x2={16} y2={0} stroke="#3b82f6" strokeWidth={2} />
        <text x={20} y={4} fontSize={10} className="fill-blue-400">
          Actual
        </text>
        <line
          x1={65}
          y1={0}
          x2={81}
          y2={0}
          stroke="#71717a"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        <text x={85} y={4} fontSize={10} className="fill-zinc-400">
          Expected
        </text>
      </g>
    </svg>
  )
}
