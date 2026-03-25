'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  predictClosingLine,
  type ClosingPrediction,
  type MarketType,
} from '@/lib/closing-line-predictor'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OddsHistoryPoint {
  bookmaker: string
  home_odds: number | null
  away_odds: number | null
  fetched_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceColor(confidence: number): string {
  if (confidence >= 70) return 'text-green-400'
  if (confidence >= 50) return 'text-amber-400'
  if (confidence >= 30) return 'text-orange-400'
  return 'text-red-400'
}

function confidenceBg(confidence: number): string {
  if (confidence >= 70) return 'bg-green-500'
  if (confidence >= 50) return 'bg-amber-500'
  if (confidence >= 30) return 'bg-orange-500'
  return 'bg-red-500'
}

function directionArrow(direction: string): string {
  if (direction === 'up') return '\u2191'
  if (direction === 'down') return '\u2193'
  return '\u2194'
}

function directionColor(direction: string): string {
  if (direction === 'up') return 'text-green-400'
  if (direction === 'down') return 'text-red-400'
  return 'text-muted-foreground'
}

// ---------------------------------------------------------------------------
// ClosingLinePredictorPanel
// ---------------------------------------------------------------------------

interface Props {
  game: NormalizedGame
  oddsHistory: OddsHistoryPoint[]
}

export function ClosingLinePredictorPanel({ game, oddsHistory }: Props) {
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('moneyline')

  const prediction = useMemo(() => {
    if (oddsHistory.length < 3) return null

    // Build snapshots from odds history
    const snapshots = oddsHistory
      .filter((h) => h.home_odds !== null)
      .map((h) => ({
        value: selectedMarket === 'moneyline' ? h.home_odds! : h.home_odds!,
        timestamp: h.fetched_at,
        bookmaker: h.bookmaker,
      }))

    if (snapshots.length < 3) return null

    return predictClosingLine(
      snapshots,
      game.commenceTime,
      selectedMarket
    )
  }, [oddsHistory, game.commenceTime, selectedMarket])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Closing Line Prediction</h3>
        <div className="flex gap-1">
          {(['moneyline', 'spread', 'total'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMarket(m)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                selectedMarket === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'moneyline' ? 'ML' : m === 'spread' ? 'Spread' : 'Total'}
            </button>
          ))}
        </div>
      </div>

      {prediction ? (
        <PredictionCard prediction={prediction} />
      ) : (
        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Not enough historical data points to predict the closing line.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Predictions require at least 3 odds snapshots spread over 30+ minutes.
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        For informational purposes only. Not financial advice. Predictions are statistical estimates based on line movement patterns.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PredictionCard
// ---------------------------------------------------------------------------

function PredictionCard({ prediction }: { prediction: ClosingPrediction }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Main prediction */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Current</p>
          <p className="text-2xl font-bold font-mono">
            {prediction.market === 'moneyline'
              ? (prediction.current >= 0 ? '+' : '') + prediction.current
              : prediction.current}
          </p>
        </div>

        <div className={`text-3xl ${directionColor(prediction.direction)}`}>
          {directionArrow(prediction.direction)}
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground">Predicted Close</p>
          <p className="text-2xl font-bold font-mono">
            {prediction.market === 'moneyline'
              ? (prediction.predicted >= 0 ? '+' : '') + prediction.predicted
              : prediction.predicted}
          </p>
        </div>
      </div>

      {/* Expected change */}
      <div className="flex items-center justify-center gap-2">
        <span className={`text-sm font-medium ${directionColor(prediction.direction)}`}>
          {prediction.direction === 'stable'
            ? 'No significant movement expected'
            : `Expected change: ${prediction.expectedChange >= 0 ? '+' : ''}${prediction.expectedChange}`}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Confidence</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${confidenceBg(prediction.confidence)}`}
                style={{ width: `${prediction.confidence}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${confidenceColor(prediction.confidence)}`}>
              {prediction.confidence}%
            </span>
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Velocity</p>
          <p className="text-xs font-medium mt-1">
            {Math.abs(prediction.velocity).toFixed(1)}/hr
            {prediction.accelerating && (
              <Badge variant="outline" className="ml-1 text-[9px] text-amber-400 border-amber-400/30">
                Accelerating
              </Badge>
            )}
          </p>
        </div>

        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Data Points</p>
          <p className="text-xs font-medium mt-1">{prediction.dataPoints} snapshots</p>
        </div>

        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Time to Game</p>
          <p className="text-xs font-medium mt-1">
            {prediction.hoursUntilStart < 1
              ? `${Math.round(prediction.hoursUntilStart * 60)}m`
              : `${prediction.hoursUntilStart.toFixed(1)}h`}
          </p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="rounded-md bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {prediction.reasoning}
        </p>
      </div>
    </div>
  )
}
