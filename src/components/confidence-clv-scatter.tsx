'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  buildConfidenceClvScatter,
  type PickForScatter,
  type ScatterAnalysis,
} from '@/lib/confidence-clv-scatter'

export function ConfidenceClvScatterPanel() {
  const [picks, setPicks] = useState<PickForScatter[]>([])
  const [confidenceMap, setConfidenceMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch { /* empty */ }
    try {
      const raw = localStorage.getItem('betbrain-confidence-ratings')
      if (raw) {
        const entries: [string, number][] = JSON.parse(raw)
        setConfidenceMap(new Map(entries))
      }
    } catch { /* empty */ }
  }, [])

  const analysis = useMemo(
    () => buildConfidenceClvScatter(picks, confidenceMap),
    [picks, confidenceMap]
  )

  if (analysis.points.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Confidence vs CLV</h3>
        <p className="text-sm text-muted-foreground">
          Rate your confidence on picks and track closing odds to see this scatter plot.
          Need picks with both confidence ratings and closing line data.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Confidence vs CLV</h3>
        <p className="text-sm text-muted-foreground">
          Does higher confidence predict better closing line value?
        </p>
      </div>

      {/* Scatter plot (SVG) */}
      <ScatterPlot analysis={analysis} />

      {/* Correlation */}
      <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
        <div>
          <div className="text-sm font-medium">Correlation</div>
          <div className="text-xs text-muted-foreground capitalize">{analysis.correlationStrength}</div>
        </div>
        <div className={`text-2xl font-bold font-mono ${
          analysis.correlation > 0.3 ? 'text-green-400' :
          analysis.correlation < -0.3 ? 'text-red-400' : 'text-zinc-400'
        }`}>
          r = {analysis.correlation.toFixed(3)}
        </div>
      </div>

      {/* Average CLV by confidence */}
      {analysis.avgClvByConfidence.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Average CLV by Confidence Level</div>
          <div className="space-y-1">
            {analysis.avgClvByConfidence.map(({ confidence, avgClv, count }) => (
              <div key={confidence} className="flex items-center gap-3 text-xs">
                <div className="w-20 shrink-0">
                  Conf {confidence}/5
                </div>
                <div className="flex-1 h-4 rounded bg-muted/30 overflow-hidden relative">
                  {avgClv !== 0 && (
                    <div
                      className={`h-full rounded ${avgClv > 0 ? 'bg-green-500' : 'bg-red-500'} absolute`}
                      style={{
                        width: `${Math.min(100, Math.abs(avgClv) * 5)}%`,
                        left: avgClv >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(avgClv) * 5)}%`,
                      }}
                    />
                  )}
                  <div className="absolute inset-0 border-l border-zinc-500" style={{ left: '50%' }} />
                </div>
                <div className={`w-16 text-right font-mono ${avgClv >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {avgClv >= 0 ? '+' : ''}{avgClv}%
                </div>
                <div className="w-8 text-right text-muted-foreground">
                  ({count})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm">{analysis.insight}</p>
      </div>

      <p className="text-xs text-muted-foreground">
        Overall avg CLV: {analysis.overallAvgClv >= 0 ? '+' : ''}{analysis.overallAvgClv}% | {analysis.points.length} picks analyzed
      </p>
    </div>
  )
}

function ScatterPlot({ analysis }: { analysis: ScatterAnalysis }) {
  const width = 300
  const height = 200
  const padding = 30

  // Scale: x = confidence (1-5), y = CLV
  const xMin = 0.5
  const xMax = 5.5
  const clvValues = analysis.points.map((p) => p.clv)
  const yMin = Math.min(-10, ...clvValues)
  const yMax = Math.max(10, ...clvValues)

  const scaleX = (v: number) => padding + ((v - xMin) / (xMax - xMin)) * (width - 2 * padding)
  const scaleY = (v: number) => height - padding - ((v - yMin) / (yMax - yMin)) * (height - 2 * padding)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto">
      {/* Axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#444" strokeWidth={1} />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#444" strokeWidth={1} />

      {/* Zero line */}
      <line x1={padding} y1={scaleY(0)} x2={width - padding} y2={scaleY(0)} stroke="#555" strokeWidth={0.5} strokeDasharray="4" />

      {/* X axis labels */}
      {[1, 2, 3, 4, 5].map((v) => (
        <text key={v} x={scaleX(v)} y={height - 10} textAnchor="middle" fill="#888" fontSize={10}>
          {v}
        </text>
      ))}

      {/* Y axis labels */}
      <text x={5} y={scaleY(yMax) + 4} fill="#888" fontSize={9}>{yMax.toFixed(0)}%</text>
      <text x={5} y={scaleY(0) + 4} fill="#888" fontSize={9}>0%</text>
      <text x={5} y={scaleY(yMin) + 4} fill="#888" fontSize={9}>{yMin.toFixed(0)}%</text>

      {/* Points */}
      {analysis.points.map((point) => (
        <circle
          key={point.id}
          cx={scaleX(point.confidence)}
          cy={scaleY(point.clv)}
          r={4}
          fill={point.outcome === 'win' ? '#4ade80' : point.outcome === 'loss' ? '#f87171' : '#a1a1aa'}
          opacity={0.7}
        >
          <title>{point.label}: Conf {point.confidence}, CLV {point.clv.toFixed(1)}% ({point.outcome})</title>
        </circle>
      ))}

      {/* Axis labels */}
      <text x={width / 2} y={height - 1} textAnchor="middle" fill="#888" fontSize={10}>
        Confidence
      </text>
      <text x={8} y={height / 2} textAnchor="middle" fill="#888" fontSize={10} transform={`rotate(-90, 8, ${height / 2})`}>
        CLV %
      </text>
    </svg>
  )
}
