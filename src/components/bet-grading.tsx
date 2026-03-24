'use client'

import { useState, useMemo } from 'react'
import {
  gradeBet,
  getGradeColor,
  getAlignmentInfo,
  type BetForGrading,
  type BetGrade,
} from '@/lib/bet-grading'

export function BetGradingCard() {
  const [formData, setFormData] = useState<BetForGrading>({
    hasThesis: false,
    lineShopped: false,
    beatClosingLine: null,
    confidence: 3,
    sizingAccuracy: 1.0,
    hoursBeforeGame: 4,
    isChaseBet: false,
    followedSystem: true,
    outcome: null,
  })

  const grade = useMemo(() => gradeBet(formData), [formData])

  function update<K extends keyof BetForGrading>(key: K, value: BetForGrading[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Bet Grading</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Grade your bet process quality. Focus on decisions, not outcomes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input form */}
        <div className="space-y-3 rounded-lg border border-border bg-zinc-900 p-4">
          <h4 className="text-sm font-semibold text-zinc-300">Process Checklist</h4>

          <ToggleRow
            label="Did you have a clear thesis?"
            description="Written reasoning before placing the bet"
            value={formData.hasThesis}
            onChange={(v) => update('hasThesis', v)}
          />

          <ToggleRow
            label="Did you shop the line?"
            description="Compared odds across 2+ sportsbooks"
            value={formData.lineShopped}
            onChange={(v) => update('lineShopped', v)}
          />

          <ToggleRow
            label="Did you follow your system?"
            description="Placed according to your rules, not emotion"
            value={formData.followedSystem}
            onChange={(v) => update('followedSystem', v)}
          />

          <ToggleRow
            label="Was this a chase bet?"
            description="Placed to recover from a previous loss"
            value={formData.isChaseBet}
            onChange={(v) => update('isChaseBet', v)}
            inverted
          />

          <div>
            <label className="text-xs text-zinc-400">Hours before game when placed</label>
            <input
              type="number"
              value={formData.hoursBeforeGame}
              onChange={(e) => update('hoursBeforeGame', Math.max(0, parseFloat(e.target.value) || 0))}
              min="0"
              step="0.5"
              className="mt-1 w-full rounded-md border border-border bg-zinc-950 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Sizing accuracy (1.0 = matched recommended)</label>
            <input
              type="number"
              value={formData.sizingAccuracy}
              onChange={(e) => update('sizingAccuracy', Math.max(0.1, parseFloat(e.target.value) || 1))}
              min="0.1"
              max="3.0"
              step="0.1"
              className="mt-1 w-full rounded-md border border-border bg-zinc-950 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">CLV (did you beat the closing line?)</label>
            <div className="flex gap-2 mt-1">
              {[
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
                { value: null, label: 'Unknown' },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => update('beatClosingLine', value)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    formData.beatClosingLine === value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-border hover:bg-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400">Outcome (optional)</label>
            <div className="flex gap-2 mt-1">
              {[
                { value: 'win' as const, label: 'Win' },
                { value: 'loss' as const, label: 'Loss' },
                { value: 'push' as const, label: 'Push' },
                { value: null, label: 'N/A' },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => update('outcome', value)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    formData.outcome === value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-border hover:bg-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grade display */}
        <div className="space-y-3">
          <GradeDisplay grade={grade} />
        </div>
      </div>

      <p className="text-xs text-zinc-500 italic">
        For informational purposes only. Not financial advice.
        Focus on improving your process score over time, not individual outcomes.
      </p>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  inverted = false,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
  inverted?: boolean
}) {
  const isPositive = inverted ? !value : value

  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full text-left rounded-md border p-2 transition-colors ${
        isPositive
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-sm border ${
          isPositive ? 'bg-green-500 border-green-600' : 'border-zinc-600'
        } flex items-center justify-center text-white text-xs`}>
          {isPositive && '\u2713'}
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-zinc-500">{description}</div>
        </div>
      </div>
    </button>
  )
}

function GradeDisplay({ grade }: { grade: BetGrade }) {
  const alignmentInfo = getAlignmentInfo(grade.outcomeAlignment)

  return (
    <div className="space-y-3">
      {/* Big grade */}
      <div className="rounded-lg border border-border bg-zinc-900 p-4 text-center">
        <div className={`text-5xl font-bold ${getGradeColor(grade.grade)}`}>
          {grade.grade}
        </div>
        <div className="text-sm text-zinc-400 mt-1">{grade.processLabel}</div>
        <div className="text-xs text-zinc-500 mt-0.5">Score: {grade.score}/100</div>

        {grade.outcomeAlignment !== 'pending' && (
          <div className={`mt-2 text-xs font-medium ${alignmentInfo.color}`}>
            {alignmentInfo.icon} {alignmentInfo.label}
          </div>
        )}
      </div>

      {/* Criteria breakdown */}
      {grade.criteria.map((criterion) => (
        <div key={criterion.name} className="rounded-md border border-border bg-zinc-900/50 p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{criterion.name}</span>
            <span className="text-zinc-400">{criterion.score}/100</span>
          </div>
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${
                criterion.score >= 70 ? 'bg-green-500' :
                criterion.score >= 50 ? 'bg-blue-500' :
                criterion.score >= 30 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ width: `${criterion.score}%` }}
            />
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{criterion.detail}</div>
        </div>
      ))}
    </div>
  )
}
