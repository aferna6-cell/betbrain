'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OddsDisplay } from '@/components/odds-display'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import { scanForEV } from '@/lib/ev-scanner'
import { optimizeParlays, evaluateCombo } from '@/lib/parlay-optimizer'
import type { ParlayCandidate, ParlayCombo, ParlayOptimizeResult } from '@/lib/parlay-optimizer'
import type { NormalizedGame } from '@/lib/sports/config'

// Build candidates from game odds data
function gamesToCandidates(games: NormalizedGame[]): ParlayCandidate[] {
  const evResult = scanForEV(games)
  const candidates: ParlayCandidate[] = []

  for (const game of games) {
    if (game.bookmakers.length < 2) continue

    // Find best moneyline for each side
    let bestHomeOdds = -Infinity
    let bestAwayOdds = -Infinity
    for (const bk of game.bookmakers) {
      if (bk.moneyline?.home != null && bk.moneyline.home > bestHomeOdds) {
        bestHomeOdds = bk.moneyline.home
      }
      if (bk.moneyline?.away != null && bk.moneyline.away > bestAwayOdds) {
        bestAwayOdds = bk.moneyline.away
      }
    }

    // Check if there are EV opportunities for this game
    const gameEV = evResult.opportunities.filter((e) => e.game.id === game.id)
    const homeEV = gameEV.find((e) => e.side === 'home')
    const awayEV = gameEV.find((e) => e.side === 'away')

    if (bestHomeOdds > -Infinity) {
      candidates.push({
        id: `${game.id}-home-ml`,
        description: `${game.homeTeam} ML`,
        odds: bestHomeOdds,
        sport: game.sport,
        gameId: game.id,
        team: game.homeTeam,
        side: 'home',
        market: 'moneyline',
        fairProbability: homeEV?.fairProbability,
        confidence: homeEV ? Math.min(50 + homeEV.ev * 5, 90) : undefined,
      })
    }

    if (bestAwayOdds > -Infinity) {
      candidates.push({
        id: `${game.id}-away-ml`,
        description: `${game.awayTeam} ML`,
        odds: bestAwayOdds,
        sport: game.sport,
        gameId: game.id,
        team: game.awayTeam,
        side: 'away',
        market: 'moneyline',
        fairProbability: awayEV?.fairProbability,
        confidence: awayEV ? Math.min(50 + awayEV.ev * 5, 90) : undefined,
      })
    }
  }

  return candidates
}

function ComboCard({ combo, wager }: { combo: ParlayCombo; wager: number }) {
  const profit = Math.round((combo.payout * wager - wager) * 100) / 100

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${
      combo.correlationRisk > 50
        ? 'border-yellow-500/30 bg-yellow-500/5'
        : combo.ev > 0
        ? 'border-green-500/30 bg-green-500/5'
        : 'border-border bg-card'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {combo.legCount}-Leg
          </Badge>
          {combo.ev > 0 && (
            <Badge className="bg-green-500/20 text-green-500 text-xs">
              +{combo.ev}% EV
            </Badge>
          )}
          {combo.correlationRisk > 30 && (
            <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">
              Corr: {combo.correlationRisk}
            </Badge>
          )}
        </div>
        <span className="font-mono text-sm font-bold">
          <OddsDisplay odds={combo.americanOdds} />
        </span>
      </div>

      {/* Legs */}
      <div className="space-y-1">
        {combo.legs.map((leg) => (
          <div key={leg.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                {SPORT_LABELS[leg.sport] ?? leg.sport}
              </Badge>
              <span className="font-medium">{leg.description}</span>
            </div>
            <OddsDisplay odds={leg.odds} className="font-mono text-xs" />
          </div>
        ))}
      </div>

      {/* Payout */}
      <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
        <span className="text-muted-foreground">
          ${wager} to win <span className="font-mono font-bold text-foreground">${profit.toFixed(2)}</span>
        </span>
        <span className="text-muted-foreground">
          Prob: {(combo.fairProbability * 100).toFixed(1)}%
        </span>
      </div>

      {/* Warnings */}
      {combo.warnings.length > 0 && (
        <div className="text-[10px] text-yellow-500">
          {combo.warnings.map((w, i) => (
            <p key={i}>&bull; {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export function ParlayOptimizerPanel({ games }: { games: NormalizedGame[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [legCounts, setLegCounts] = useState<number[]>([2, 3])
  const [wager, setWager] = useState(10)
  const [showAll, setShowAll] = useState(false)

  const allCandidates = useMemo(() => gamesToCandidates(games), [games])

  const selectedCandidates = useMemo(
    () => allCandidates.filter((c) => selectedIds.has(c.id)),
    [allCandidates, selectedIds]
  )

  const result = useMemo<ParlayOptimizeResult | null>(() => {
    if (selectedCandidates.length < 2) return null
    return optimizeParlays(selectedCandidates, legCounts, 20)
  }, [selectedCandidates, legCounts])

  function toggleCandidate(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(allCandidates.map((c) => c.id)))
  }

  function clearAll() {
    setSelectedIds(new Set())
  }

  // Group candidates by game
  const gameGroups = useMemo(() => {
    const map = new Map<string, { game: NormalizedGame; candidates: ParlayCandidate[] }>()
    for (const c of allCandidates) {
      const game = games.find((g) => g.id === c.gameId)
      if (!game) continue
      const existing = map.get(c.gameId)
      if (existing) {
        existing.candidates.push(c)
      } else {
        map.set(c.gameId, { game, candidates: [c] })
      }
    }
    return Array.from(map.values())
  }, [allCandidates, games])

  const displayedGames = showAll ? gameGroups : gameGroups.slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Legs:</label>
          {[2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => {
                setLegCounts((prev) =>
                  prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
                )
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                legCounts.includes(n)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Wager: $</label>
          <input
            type="number"
            min={1}
            value={wager}
            onChange={(e) => setWager(Math.max(1, parseInt(e.target.value) || 10))}
            className="h-7 w-16 rounded-md border border-border bg-background px-2 text-xs font-mono"
          />
        </div>

        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearAll}>
          Clear
        </Button>

        <Badge variant="secondary" className="text-xs">
          {selectedIds.size} selected
        </Badge>
      </div>

      {/* Candidate selection */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Pick Pool ({allCandidates.length} candidates from {gameGroups.length} games)
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {displayedGames.map(({ game, candidates }) => (
            <div key={game.id} className="rounded-md border border-border p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {SPORT_LABELS[game.sport] ?? game.sport}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {game.awayTeam} @ {game.homeTeam}
                </span>
              </div>
              <div className="space-y-1">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCandidate(c.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                      selectedIds.has(c.id)
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    <span>{c.description}</span>
                    <OddsDisplay odds={c.odds} className="font-mono text-[11px]" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {gameGroups.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {showAll ? 'Show less' : `Show all ${gameGroups.length} games`}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Optimized Parlays ({result.combos.length} of {result.combosEvaluated} combos)
          </h3>

          {/* Highlights */}
          <div className="grid gap-3 sm:grid-cols-3">
            {result.bestEV && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <p className="text-[10px] text-green-500 font-semibold uppercase">Best +EV</p>
                <p className="text-sm font-bold">+{result.bestEV.ev}% EV</p>
                <p className="text-[10px] text-muted-foreground">
                  {result.bestEV.legs.map((l) => l.description).join(' + ')}
                </p>
              </div>
            )}
            {result.safest && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <p className="text-[10px] text-blue-500 font-semibold uppercase">Safest</p>
                <p className="text-sm font-bold">Corr: {result.safest.correlationRisk}</p>
                <p className="text-[10px] text-muted-foreground">
                  {result.safest.legs.map((l) => l.description).join(' + ')}
                </p>
              </div>
            )}
            {result.bestPayout && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
                <p className="text-[10px] text-purple-500 font-semibold uppercase">Best Payout</p>
                <p className="text-sm font-bold">${Math.round(result.bestPayout.payout * wager)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {result.bestPayout.legs.map((l) => l.description).join(' + ')}
                </p>
              </div>
            )}
          </div>

          {/* Combo cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {result.combos.map((combo, i) => (
              <ComboCard key={i} combo={combo} wager={wager} />
            ))}
          </div>
        </div>
      )}

      {selectedCandidates.length > 0 && selectedCandidates.length < 2 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Select at least 2 picks to generate parlay combinations.
          </p>
        </div>
      )}

      {allCandidates.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No games with odds data available. Check back when games are scheduled.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice. Parlay odds compound risk — most parlays lose.
        Consider correlation risk before combining legs from related events.
      </p>
    </div>
  )
}
