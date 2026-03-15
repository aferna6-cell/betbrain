'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ParlayLeg, ParlayAnalysis } from '@/lib/ai/parlay-analyzer'

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}

const SPORTS = [
  { value: 'nba', label: 'NBA' },
  { value: 'nfl', label: 'NFL' },
  { value: 'mlb', label: 'MLB' },
  { value: 'nhl', label: 'NHL' },
]

function LegInput({
  index,
  leg,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number
  leg: ParlayLeg
  onChange: (leg: ParlayLeg) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const descId = `parlay-leg-desc-${index}`
  const oddsId = `parlay-leg-odds-${index}`
  const sportId = `parlay-leg-sport-${index}`

  return (
    <div className="flex items-end gap-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex-1">
        <label htmlFor={descId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Leg {index + 1}
        </label>
        <input
          id={descId}
          type="text"
          value={leg.description}
          onChange={(e) => onChange({ ...leg, description: e.target.value })}
          placeholder="e.g. Lakers ML, LeBron O25.5 pts"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="w-24">
        <label htmlFor={oddsId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Odds
        </label>
        <input
          id={oddsId}
          type="number"
          value={leg.odds || ''}
          onChange={(e) =>
            onChange({ ...leg, odds: parseInt(e.target.value, 10) || 0 })
          }
          placeholder="-110"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="w-24">
        <label htmlFor={sportId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Sport
        </label>
        <select
          id={sportId}
          value={leg.sport}
          onChange={(e) => onChange({ ...leg, sport: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SPORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {canRemove && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove leg ${index + 1}`}
          className="text-red-500 hover:text-red-400"
        >
          Remove
        </Button>
      )}
    </div>
  )
}

function ParlayResult({ result }: { result: ParlayAnalysis }) {
  const recColor =
    result.recommendation === 'bet'
      ? 'text-green-500'
      : result.recommendation === 'reduce'
        ? 'text-yellow-500'
        : 'text-red-500'

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">
            {result.legs.length}-Leg Parlay
          </h3>
          <Badge variant="outline" className="font-mono text-xs">
            {formatOdds(result.combinedOdds)}
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {result.payoutMultiplier.toFixed(2)}x
          </Badge>
        </div>
        <Badge
          variant={result.recommendation === 'bet' ? 'default' : 'secondary'}
          className={`text-sm font-bold uppercase ${recColor}`}
        >
          {result.recommendation}
        </Badge>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground">{result.summary}</p>

      {/* EV Assessment */}
      <div
        className={`rounded-md px-3 py-2 ${
          result.assessment.isPositiveEV
            ? 'bg-green-500/10'
            : 'bg-red-500/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {result.assessment.isPositiveEV ? '+EV' : '-EV'} Parlay
          </span>
          <span
            className={`font-mono text-sm font-bold ${
              result.assessment.isPositiveEV
                ? 'text-green-500'
                : 'text-red-500'
            }`}
          >
            {result.assessment.expectedValue > 0 ? '+' : ''}
            {(result.assessment.expectedValue * 100).toFixed(0)}c per $1
          </span>
        </div>
        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Estimated probability:{' '}
            {result.assessment.estimatedTrueProbability.toFixed(1)}%
          </span>
          <span>
            Implied: {(result.impliedProbability * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Correlation Warnings */}
      {result.correlationWarnings.length > 0 && (
        <div className="rounded-md bg-yellow-500/10 px-3 py-2">
          <p className="mb-1 text-xs font-medium text-yellow-500">
            Correlation Warnings
          </p>
          {result.correlationWarnings.map((w, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Leg Analyses */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Leg Analysis
        </p>
        <div className="space-y-2">
          {result.legAnalyses.map((la, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{la.description}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{la.confidence}%</Badge>
                <Badge
                  variant={
                    la.risk === 'low'
                      ? 'default'
                      : la.risk === 'high'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="text-xs"
                >
                  {la.risk}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="border-t border-border pt-2 text-xs italic text-muted-foreground">
        {result.disclaimer}
      </p>
    </div>
  )
}

const emptyLeg = (): ParlayLeg => ({
  description: '',
  odds: -110,
  sport: 'nba',
})

export function ParlayBuilderForm() {
  const [legs, setLegs] = useState<ParlayLeg[]>([emptyLeg(), emptyLeg()])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParlayAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addLeg = () => {
    if (legs.length < 10) setLegs([...legs, emptyLeg()])
  }

  const removeLeg = (index: number) => {
    setLegs(legs.filter((_, i) => i !== index))
  }

  const updateLeg = (index: number, leg: ParlayLeg) => {
    const updated = [...legs]
    updated[index] = leg
    setLegs(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    // Validate legs have descriptions
    const validLegs = legs.filter((l) => l.description.trim())
    if (validLegs.length < 2) {
      setError('Enter at least 2 legs with descriptions')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/analysis/parlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legs: validLegs }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed')
        return
      }
      setResult(data)
    } catch {
      setError('Failed to analyze parlay. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        {legs.map((leg, i) => (
          <LegInput
            key={i}
            index={i}
            leg={leg}
            onChange={(updated) => updateLeg(i, updated)}
            onRemove={() => removeLeg(i)}
            canRemove={legs.length > 2}
          />
        ))}

        <div className="flex items-center gap-2">
          {legs.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLeg}
            >
              + Add Leg
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {legs.length}/10 legs
          </span>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Analyzing...' : 'Analyze Parlay'}
        </Button>
      </form>

      {result && <ParlayResult result={result} />}
    </div>
  )
}
