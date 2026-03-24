'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  buildQualityOutcomeMatrix,
  getQuadrantPercentages,
  type MatrixPick,
  type Quadrant,
  type QualityOutcomeMatrix as MatrixType,
} from '@/lib/quality-outcome-matrix'
import { gradeBet, type BetForGrading } from '@/lib/bet-grading'

interface UserPick {
  id: string
  outcome: string | null
  profit: number | null
  sport?: string
  pick_type?: string
  pick_team?: string | null
  odds?: number
  notes?: string | null
}

const STORAGE_KEY = 'betbrain-bet-grades'

interface StoredGrade {
  pickId: string
  score: number
  criteria: BetForGrading
}

export function QualityOutcomeMatrixPanel() {
  const [picks, setPicks] = useState<UserPick[]>([])
  const [grades, setGrades] = useState<StoredGrade[]>([])
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch { /* empty */ }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setGrades(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  const matrixPicks = useMemo((): MatrixPick[] => {
    const gradeMap = new Map(grades.map((g) => [g.pickId, g.score]))
    return picks
      .filter((p) => p.outcome === 'win' || p.outcome === 'loss')
      .filter((p) => gradeMap.has(p.id))
      .map((p) => ({
        id: p.id,
        processScore: gradeMap.get(p.id)!,
        outcome: p.outcome as 'win' | 'loss',
        profit: p.profit ?? 0,
        sport: p.sport,
        pickType: p.pick_type,
        label: p.pick_team ? `${p.pick_team} ${p.odds ? `(${p.odds > 0 ? '+' : ''}${p.odds})` : ''}` : undefined,
      }))
  }, [picks, grades])

  const matrix = useMemo(() => buildQualityOutcomeMatrix(matrixPicks), [matrixPicks])
  const pcts = useMemo(() => getQuadrantPercentages(matrix), [matrix])

  if (matrixPicks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Quality vs Outcome Matrix</h3>
        <p className="text-sm text-muted-foreground">
          Grade your bets on the Tools page to see how process quality maps to outcomes.
          Need at least 1 graded, resolved pick.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Quality vs Outcome Matrix</h3>
        <p className="text-sm text-muted-foreground">
          Process quality (x-axis) vs outcome (y-axis). Earned wins are sustainable.
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2">
        <QuadrantCell
          data={matrix.quadrants['earned-win']}
          pct={pcts['earned-win']}
          isSelected={selectedQuadrant === 'earned-win'}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'earned-win' ? null : 'earned-win')}
        />
        <QuadrantCell
          data={matrix.quadrants['bad-beat']}
          pct={pcts['bad-beat']}
          isSelected={selectedQuadrant === 'bad-beat'}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'bad-beat' ? null : 'bad-beat')}
        />
        <QuadrantCell
          data={matrix.quadrants['got-lucky']}
          pct={pcts['got-lucky']}
          isSelected={selectedQuadrant === 'got-lucky'}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'got-lucky' ? null : 'got-lucky')}
        />
        <QuadrantCell
          data={matrix.quadrants['expected-loss']}
          pct={pcts['expected-loss']}
          isSelected={selectedQuadrant === 'expected-loss'}
          onClick={() => setSelectedQuadrant(selectedQuadrant === 'expected-loss' ? null : 'expected-loss')}
        />
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Bad Process</span>
        <span>Good Process</span>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-400">{matrix.sustainabilityScore}%</div>
          <div className="text-xs text-muted-foreground">Sustainability</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-400">{matrix.luckFactor}%</div>
          <div className="text-xs text-muted-foreground">Luck Factor</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-400">{matrix.disciplineScore}%</div>
          <div className="text-xs text-muted-foreground">Discipline</div>
        </div>
      </div>

      {/* Insight */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm">{matrix.insight}</p>
      </div>

      {/* Expanded quadrant detail */}
      {selectedQuadrant && matrix.quadrants[selectedQuadrant].count > 0 && (
        <QuadrantDetail data={matrix.quadrants[selectedQuadrant]} />
      )}
    </div>
  )
}

function QuadrantCell({
  data,
  pct,
  isSelected,
  onClick,
}: {
  data: MatrixType['quadrants'][Quadrant]
  pct: number
  isSelected: boolean
  onClick: () => void
}) {
  const bgColors: Record<Quadrant, string> = {
    'earned-win': 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30',
    'bad-beat': 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
    'got-lucky': 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
    'expected-loss': 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30',
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-all ${bgColors[data.quadrant]} ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div className={`text-sm font-medium ${data.color}`}>{data.label}</div>
      <div className="text-2xl font-bold mt-1">{data.count}</div>
      <div className="text-xs text-muted-foreground">{pct}% of picks</div>
      {data.count > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          P/L: {data.totalProfit >= 0 ? '+' : ''}{data.totalProfit.toFixed(1)}u
        </div>
      )}
    </button>
  )
}

function QuadrantDetail({ data }: { data: MatrixType['quadrants'][Quadrant] }) {
  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className={`text-sm font-semibold ${data.color}`}>{data.label}</div>
      <p className="text-xs text-muted-foreground">{data.description}</p>
      <div className="text-xs text-muted-foreground">
        Avg process score: {data.avgProcessScore} | Total P/L: {data.totalProfit >= 0 ? '+' : ''}{data.totalProfit.toFixed(1)}u
      </div>
      {data.picks.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {data.picks.slice(0, 10).map((pick) => (
            <div key={pick.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
              <span className="truncate mr-2">{pick.label || pick.sport || 'Pick'}</span>
              <span className={pick.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                {pick.profit >= 0 ? '+' : ''}{pick.profit.toFixed(1)}u
              </span>
            </div>
          ))}
          {data.picks.length > 10 && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              +{data.picks.length - 10} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}
