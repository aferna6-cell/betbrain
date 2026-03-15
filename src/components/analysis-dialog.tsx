'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RISK_COLORS } from '@/lib/format'
import type { NormalizedGame } from '@/lib/sports/config'

interface GameAnalysis {
  summary: string
  keyFactors: string[]
  valueAssessment: {
    side: 'home' | 'away' | 'neither'
    reasoning: string
  }
  riskLevel: 'low' | 'medium' | 'high'
  confidence: number
  disclaimer: string
  fromCache: boolean
}

export function AnalyzeButton({ game }: { game: NormalizedGame }) {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, sport: game.sport }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Analysis failed')
        return
      }

      setAnalysis(data)
      setOpen(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : 'AI Analysis'}
      </Button>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {open && analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {game.awayTeam} @ {game.homeTeam}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Confidence + Risk */}
            <div className="mb-4 flex gap-3">
              <Badge variant="secondary" className="font-mono">
                Confidence: {analysis.confidence}%
              </Badge>
              <Badge variant="outline">
                Risk:{' '}
                <span className={RISK_COLORS[analysis.riskLevel]}>
                  {analysis.riskLevel.toUpperCase()}
                </span>
              </Badge>
              {analysis.fromCache && (
                <Badge variant="outline" className="text-xs">
                  Cached
                </Badge>
              )}
            </div>

            {/* Summary */}
            <div className="mb-4">
              <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
                Summary
              </h4>
              <p className="text-sm">{analysis.summary}</p>
            </div>

            {/* Key Factors */}
            <div className="mb-4">
              <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
                Key Factors
              </h4>
              <ul className="space-y-1">
                {analysis.keyFactors.map((factor, i) => (
                  <li key={i} className="text-sm">
                    <span className="mr-2 text-muted-foreground">
                      {i + 1}.
                    </span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Value Assessment */}
            <div className="mb-4">
              <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
                Value Assessment
              </h4>
              <p className="text-sm">
                <span className="font-medium capitalize">
                  {analysis.valueAssessment.side === 'neither'
                    ? 'No clear value'
                    : `${analysis.valueAssessment.side} side`}
                </span>
                {' — '}
                {analysis.valueAssessment.reasoning}
              </p>
            </div>

            {/* Disclaimer */}
            <p className="mt-4 border-t border-border pt-3 text-xs italic text-muted-foreground">
              {analysis.disclaimer}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
