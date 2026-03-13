'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface InjuryImpactResult {
  playerName: string
  injuryStatus: string
  impactSummary: string
  winProbabilityShift: {
    direction: 'favors_home' | 'favors_away' | 'negligible'
    magnitude: 'large' | 'moderate' | 'small'
    explanation: string
  }
  lineImpact: {
    alreadyPricedIn: boolean
    explanation: string
  }
  valueShift: {
    side: 'home' | 'away' | 'neither'
    reasoning: string
  }
  disclaimer: string
}

const INJURY_STATUSES = [
  'Out',
  'Doubtful',
  'Questionable',
  'Probable',
  'Day-to-Day',
  'Limited',
]

const MAGNITUDE_COLORS = {
  large: 'text-red-500',
  moderate: 'text-yellow-500',
  small: 'text-green-500',
} as const

interface InjuryImpactPanelProps {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
}

export function InjuryImpactPanel({
  gameId,
  sport,
  homeTeam,
  awayTeam,
}: InjuryImpactPanelProps) {
  const [playerName, setPlayerName] = useState('')
  const [injuryStatus, setInjuryStatus] = useState('Out')
  const [result, setResult] = useState<InjuryImpactResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    if (!playerName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/analysis/injury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          sport,
          playerName: playerName.trim(),
          injuryStatus,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Analysis failed')
        return
      }

      setResult(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function directionLabel(
    direction: string,
    home: string,
    away: string
  ): string {
    if (direction === 'favors_home') return `Favors ${home}`
    if (direction === 'favors_away') return `Favors ${away}`
    return 'Negligible impact'
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Enter a player injury to see how it shifts the value picture for this
          game. The AI will assess probability impact and whether the line already
          reflects it.
        </p>
      </div>

      {/* Input form */}
      <div className="space-y-3">
        <div>
          <label
            htmlFor="playerName"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Player Name
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. LeBron James"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="injuryStatus"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Injury Status
          </label>
          <select
            id="injuryStatus"
            value={injuryStatus}
            onChange={(e) => setInjuryStatus(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            disabled={loading}
          >
            {INJURY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={loading || !playerName.trim()}
          className="w-full"
        >
          {loading ? 'Analyzing...' : 'Analyze Injury Impact'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Result */}
      {result && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{result.playerName}</Badge>
            <Badge variant="outline">{result.injuryStatus}</Badge>
          </div>

          {/* Impact Summary */}
          <div>
            <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
              Impact Summary
            </h4>
            <p className="text-sm leading-relaxed">{result.impactSummary}</p>
          </div>

          {/* Win Probability Shift */}
          <div>
            <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
              Win Probability Shift
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {directionLabel(
                  result.winProbabilityShift.direction,
                  homeTeam,
                  awayTeam
                )}
              </span>
              <Badge
                variant="outline"
                className={
                  MAGNITUDE_COLORS[result.winProbabilityShift.magnitude]
                }
              >
                {result.winProbabilityShift.magnitude} impact
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.winProbabilityShift.explanation}
            </p>
          </div>

          {/* Line Impact */}
          <div>
            <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
              Line Impact
            </h4>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  result.lineImpact.alreadyPricedIn ? 'secondary' : 'default'
                }
              >
                {result.lineImpact.alreadyPricedIn
                  ? 'Already priced in'
                  : 'Not yet priced in'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.lineImpact.explanation}
            </p>
          </div>

          {/* Value Shift */}
          <div>
            <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
              Value Shift
            </h4>
            <p className="text-sm">
              <span className="font-medium capitalize">
                {result.valueShift.side === 'neither'
                  ? 'No clear value shift'
                  : `Value on ${result.valueShift.side === 'home' ? homeTeam : awayTeam}`}
              </span>
              {' — '}
              {result.valueShift.reasoning}
            </p>
          </div>

          {/* Disclaimer */}
          <p className="border-t border-border pt-3 text-xs italic text-muted-foreground">
            {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  )
}
