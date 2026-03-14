'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PropAnalysis } from '@/lib/ai/prop-analyzer'

const PROP_MARKETS = [
  { value: 'points', label: 'Points' },
  { value: 'rebounds', label: 'Rebounds' },
  { value: 'assists', label: 'Assists' },
  { value: 'threes', label: '3-Pointers Made' },
  { value: 'steals', label: 'Steals' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'passing_yards', label: 'Passing Yards' },
  { value: 'rushing_yards', label: 'Rushing Yards' },
  { value: 'receiving_yards', label: 'Receiving Yards' },
  { value: 'touchdowns', label: 'Touchdowns' },
  { value: 'strikeouts', label: 'Strikeouts' },
  { value: 'hits', label: 'Hits' },
  { value: 'goals', label: 'Goals' },
  { value: 'shots_on_goal', label: 'Shots on Goal' },
]

const SPORTS = [
  { value: 'nba', label: 'NBA' },
  { value: 'nfl', label: 'NFL' },
  { value: 'mlb', label: 'MLB' },
  { value: 'nhl', label: 'NHL' },
]

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}

function ResultCard({ result }: { result: PropAnalysis }) {
  const recColor =
    result.recommendation === 'over'
      ? 'text-green-500'
      : result.recommendation === 'under'
        ? 'text-red-500'
        : 'text-yellow-500'

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            {result.playerName} — {result.propMarket}
          </h3>
          <p className="text-sm text-muted-foreground">Line: {result.line}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={result.recommendation === 'pass' ? 'secondary' : 'default'}
            className={`text-sm font-bold uppercase ${recColor}`}
          >
            {result.recommendation}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {result.confidence}%
          </Badge>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground">{result.summary}</p>

      {/* Projected Range */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Projected Range
        </p>
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Floor</p>
            <p className="font-mono text-lg font-semibold">
              {result.projectedRange.low}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Most Likely</p>
            <p className="font-mono text-lg font-bold text-primary">
              {result.projectedRange.mid}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Ceiling</p>
            <p className="font-mono text-lg font-semibold">
              {result.projectedRange.high}
            </p>
          </div>
        </div>
        {/* Visual bar */}
        <div className="relative mt-2 h-2 rounded-full bg-muted">
          <div
            className="absolute top-0 h-2 rounded-full bg-primary/50"
            style={{
              left: `${((result.projectedRange.low - result.projectedRange.low) / (result.projectedRange.high - result.projectedRange.low)) * 100}%`,
              right: `${100 - ((result.projectedRange.high - result.projectedRange.low) / (result.projectedRange.high - result.projectedRange.low)) * 100}%`,
            }}
          />
          {/* Line marker */}
          <div
            className="absolute top-[-4px] h-4 w-0.5 bg-yellow-500"
            style={{
              left: `${Math.max(0, Math.min(100, ((result.line - result.projectedRange.low) / (result.projectedRange.high - result.projectedRange.low)) * 100))}%`,
            }}
          />
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
          <span>Line: {result.line}</span>
        </div>
      </div>

      {/* Edge Assessment */}
      {result.estimatedEdge.side !== 'none' && (
        <div className="rounded-md bg-green-500/10 px-3 py-2">
          <p className="text-xs font-medium text-green-500">
            Estimated Edge: {result.estimatedEdge.percentage}% on{' '}
            {result.estimatedEdge.side}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {result.estimatedEdge.reasoning}
          </p>
        </div>
      )}

      {/* Key Factors */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Key Factors
        </p>
        <ul className="space-y-1">
          {result.keyFactors.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 text-muted-foreground">{i + 1}.</span>
              <span className="text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Implied Probability */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Implied Over: {(result.impliedProbability.over * 100).toFixed(1)}%
        </span>
        <span>
          Implied Under: {(result.impliedProbability.under * 100).toFixed(1)}%
        </span>
        <Badge variant="outline" className="text-xs">
          Risk: {result.riskLevel}
        </Badge>
      </div>

      {/* Disclaimer */}
      <p className="border-t border-border pt-2 text-xs italic text-muted-foreground">
        {result.disclaimer}
      </p>
    </div>
  )
}

export function PropAnalyzerForm() {
  const [playerName, setPlayerName] = useState('')
  const [sport, setSport] = useState('nba')
  const [team, setTeam] = useState('')
  const [opponent, setOpponent] = useState('')
  const [propMarket, setPropMarket] = useState('points')
  const [line, setLine] = useState('')
  const [overOdds, setOverOdds] = useState('-110')
  const [underOdds, setUnderOdds] = useState('-110')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PropAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/analysis/prop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          sport,
          team,
          opponent,
          propMarket,
          line: parseFloat(line),
          overOdds: parseInt(overOdds, 10),
          underOdds: parseInt(underOdds, 10),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed')
        return
      }
      setResult(data)
    } catch {
      setError('Failed to analyze prop. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Player Name */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. LeBron James"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Sport */}
          <div>
            <label className="mb-1 block text-sm font-medium">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Player&apos;s Team
            </label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. Los Angeles Lakers"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Opponent */}
          <div>
            <label className="mb-1 block text-sm font-medium">Opponent</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="e.g. Boston Celtics"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Prop Market */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Prop Market
            </label>
            <select
              value={propMarket}
              onChange={(e) => setPropMarket(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PROP_MARKETS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Line */}
          <div>
            <label className="mb-1 block text-sm font-medium">Line</label>
            <input
              type="number"
              step="0.5"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="e.g. 25.5"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Over Odds */}
          <div>
            <label className="mb-1 block text-sm font-medium">Over Odds</label>
            <input
              type="number"
              value={overOdds}
              onChange={(e) => setOverOdds(e.target.value)}
              placeholder="-110"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Under Odds */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Under Odds
            </label>
            <input
              type="number"
              value={underOdds}
              onChange={(e) => setUnderOdds(e.target.value)}
              placeholder="-110"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Analyzing...' : 'Analyze Prop'}
        </Button>
      </form>

      {result && <ResultCard result={result} />}
    </div>
  )
}
