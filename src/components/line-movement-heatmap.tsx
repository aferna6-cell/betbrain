'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { generateHeatmap, type HeatmapGame } from '@/lib/line-movement-heatmap'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Line Movement Heatmap — visual overview of line activity
// ---------------------------------------------------------------------------

const HEAT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  cold: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Cold' },
  mild: { bg: 'bg-slate-800/50', text: 'text-slate-400', label: 'Mild' },
  warm: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: 'Warm' },
  hot: { bg: 'bg-orange-900/30', text: 'text-orange-400', label: 'Hot' },
  fire: { bg: 'bg-red-900/30', text: 'text-red-400', label: 'On Fire' },
}

const MARKET_LABELS: Record<string, string> = {
  moneyline: 'ML',
  spread: 'Spread',
  total: 'Total',
  none: '--',
}

type SportFilter = 'all' | 'nba' | 'nfl' | 'mlb' | 'nhl'

export function LineMovementHeatmap({ games }: { games: NormalizedGame[] }) {
  const [sportFilter, setSportFilter] = useState<SportFilter>('all')
  const [showCold, setShowCold] = useState(false)

  const result = useMemo(() => generateHeatmap(games), [games])

  const filteredGames = useMemo(() => {
    return result.games.filter((g) => {
      if (sportFilter !== 'all' && g.game.sport !== sportFilter) return false
      if (!showCold && g.heat === 'cold') return false
      return true
    })
  }, [result.games, sportFilter, showCold])

  if (result.games.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No games available to analyze. Check back when odds are loaded.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Games Tracked</p>
          <p className="text-2xl font-bold">{result.games.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg Intensity</p>
          <p className="text-2xl font-bold">{result.avgIntensity}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Hot Games</p>
          <p className="text-2xl font-bold text-orange-400">
            {result.games.filter((g) => g.heat === 'hot' || g.heat === 'fire').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Hottest</p>
          {result.hottest ? (
            <p className="text-sm font-bold text-red-400 truncate">
              {result.hottest.game.awayTeam} @ {result.hottest.game.homeTeam}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">--</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground mr-1">Sport:</span>
        {(['all', 'nba', 'nfl', 'mlb', 'nhl'] as const).map((sport) => (
          <Button
            key={sport}
            variant={sportFilter === sport ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSportFilter(sport)}
          >
            {sport === 'all' ? 'All' : sport.toUpperCase()}
          </Button>
        ))}
        <label className="flex items-center gap-1.5 ml-3 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showCold}
            onChange={(e) => setShowCold(e.target.checked)}
            className="rounded border-border"
          />
          Show cold games
        </label>
      </div>

      {/* Heatmap grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGames.map((hg) => (
          <HeatmapCard key={hg.game.id} hg={hg} />
        ))}
      </div>

      {filteredGames.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No games match the current filters.
        </p>
      )}

      <p className="text-[10px] text-muted-foreground/60 text-center">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

function HeatmapCard({ hg }: { hg: HeatmapGame }) {
  const style = HEAT_STYLES[hg.heat] ?? HEAT_STYLES.mild

  return (
    <Link
      href={`/dashboard/games/${encodeURIComponent(hg.game.id)}`}
      className={`block rounded-lg border border-border/50 p-3 transition-colors hover:border-primary/30 ${style.bg}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="secondary" className="text-[10px] font-semibold uppercase px-1.5 py-0">
          {SPORT_LABELS[hg.game.sport] ?? hg.game.sport}
        </Badge>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
          <IntensityBar intensity={hg.intensity} />
        </div>
      </div>

      <div className="text-sm font-medium mb-1">
        {hg.game.awayTeam} @ {hg.game.homeTeam}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
        <span>Hot market: <span className="text-foreground">{MARKET_LABELS[hg.hotMarket]}</span></span>
        <span className="font-mono">{hg.intensity}/100</span>
      </div>

      {/* Movement bars */}
      <div className="space-y-1">
        {hg.mlRange > 0 && (
          <MovementBar label="ML" value={hg.mlRange} max={15} unit="%" />
        )}
        {hg.spreadRange > 0 && (
          <MovementBar label="Spread" value={hg.spreadRange} max={3} unit="pts" />
        )}
        {hg.totalRange > 0 && (
          <MovementBar label="Total" value={hg.totalRange} max={5} unit="pts" />
        )}
      </div>
    </Link>
  )
}

function IntensityBar({ intensity }: { intensity: number }) {
  const width = Math.min(100, intensity)
  const color = intensity >= 75 ? 'bg-red-500' :
    intensity >= 50 ? 'bg-orange-500' :
    intensity >= 25 ? 'bg-yellow-500' : 'bg-blue-500'

  return (
    <div className="w-12 h-1.5 rounded-full bg-muted/30 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function MovementBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 75 ? 'bg-red-500/60' :
    pct >= 50 ? 'bg-orange-500/60' :
    pct >= 25 ? 'bg-yellow-500/60' : 'bg-blue-500/60'

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-12">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted/20 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-14 text-right">
        {value}{unit}
      </span>
    </div>
  )
}
