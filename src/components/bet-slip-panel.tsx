'use client'

import { useState, useMemo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  analyzeSlip,
  addLeg,
  removeLeg,
  formatSlipAsText,
  type SlipLeg,
  type SlipConfig,
  type SlipMode,
} from '@/lib/bet-slip'
import { americanToImplied, formatOdds } from '@/lib/odds'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'betbrain-bet-slip'

function loadSlipLegs(): SlipLeg[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SlipLeg[]) : []
  } catch {
    return []
  }
}

function saveSlipLegs(legs: SlipLeg[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legs))
  } catch { /* ignore full storage */ }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityColor(severity: string): string {
  switch (severity) {
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  }
}

function evColor(ev: number | null): string {
  if (ev === null) return 'text-muted-foreground'
  if (ev > 0) return 'text-green-400'
  if (ev < -3) return 'text-red-400'
  return 'text-amber-400'
}

// ---------------------------------------------------------------------------
// BetSlipPanel
// ---------------------------------------------------------------------------

interface Props {
  game: NormalizedGame
}

export function BetSlipPanel({ game }: Props) {
  const [legs, setLegs] = useState<SlipLeg[]>(() => loadSlipLegs())
  const [mode, setMode] = useState<SlipMode>('parlay')
  const [units, setUnits] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const config: SlipConfig = useMemo(() => ({ mode, units }), [mode, units])
  const analysis = useMemo(() => analyzeSlip(legs, config), [legs, config])

  const currentGameLegs = legs.filter((l) => l.gameId === game.id)
  const otherLegs = legs.filter((l) => l.gameId !== game.id)

  const handleAdd = useCallback((leg: SlipLeg) => {
    const result = addLeg(legs, leg)
    setLegs(result.legs)
    saveSlipLegs(result.legs)
    setMessage(result.warning)
    if (result.warning) {
      setTimeout(() => setMessage(null), 3000)
    }
  }, [legs])

  const handleRemove = useCallback((legId: string) => {
    const updated = removeLeg(legs, legId)
    setLegs(updated)
    saveSlipLegs(updated)
  }, [legs])

  const handleClear = useCallback(() => {
    setLegs([])
    saveSlipLegs([])
  }, [])

  const handleCopy = useCallback(() => {
    const text = formatSlipAsText(legs, analysis, config)
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [legs, analysis, config])

  // Build quick-add options from game bookmakers
  const quickOptions = useMemo(() => {
    const opts: Array<{ label: string; leg: SlipLeg }> = []
    if (game.bookmakers.length === 0) return opts

    // Use consensus (first bookmaker that has each market)
    const bestBook = game.bookmakers[0]

    if (bestBook.moneyline?.home !== null && bestBook.moneyline?.away !== null) {
      const homeOdds = bestBook.moneyline!.home!
      const awayOdds = bestBook.moneyline!.away!
      opts.push({
        label: `${game.homeTeam} ML (${formatOdds(homeOdds)})`,
        leg: {
          id: `${game.id}-ml-home`,
          gameId: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          side: 'home',
          market: 'moneyline',
          odds: homeOdds,
          line: null,
          fairProbability: null,
          bookmaker: bestBook.bookmaker,
          commenceTime: game.commenceTime,
        },
      })
      opts.push({
        label: `${game.awayTeam} ML (${formatOdds(awayOdds)})`,
        leg: {
          id: `${game.id}-ml-away`,
          gameId: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          side: 'away',
          market: 'moneyline',
          odds: awayOdds,
          line: null,
          fairProbability: null,
          bookmaker: bestBook.bookmaker,
          commenceTime: game.commenceTime,
        },
      })
    }

    if (bestBook.spread?.homeOdds !== null && bestBook.spread?.awayOdds !== null) {
      const sp = bestBook.spread!
      opts.push({
        label: `${game.homeTeam} ${sp.homeLine! >= 0 ? '+' : ''}${sp.homeLine} (${formatOdds(sp.homeOdds!)})`,
        leg: {
          id: `${game.id}-sp-home`,
          gameId: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          side: 'home',
          market: 'spread',
          odds: sp.homeOdds!,
          line: sp.homeLine,
          fairProbability: null,
          bookmaker: bestBook.bookmaker,
          commenceTime: game.commenceTime,
        },
      })
      opts.push({
        label: `${game.awayTeam} ${sp.awayLine! >= 0 ? '+' : ''}${sp.awayLine} (${formatOdds(sp.awayOdds!)})`,
        leg: {
          id: `${game.id}-sp-away`,
          gameId: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          side: 'away',
          market: 'spread',
          odds: sp.awayOdds!,
          line: sp.awayLine,
          fairProbability: null,
          bookmaker: bestBook.bookmaker,
          commenceTime: game.commenceTime,
        },
      })
    }

    if (bestBook.total?.overOdds !== null && bestBook.total?.underOdds !== null) {
      const t = bestBook.total!
      opts.push({
        label: `Over ${t.line} (${formatOdds(t.overOdds!)})`,
        leg: {
          id: `${game.id}-total-over`,
          gameId: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          side: 'over',
          market: 'total',
          odds: t.overOdds!,
          line: t.line,
          fairProbability: null,
          bookmaker: bestBook.bookmaker,
          commenceTime: game.commenceTime,
        },
      })
      opts.push({
        label: `Under ${t.line} (${formatOdds(t.underOdds!)})`,
        leg: {
          id: `${game.id}-total-under`,
          gameId: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          side: 'under',
          market: 'total',
          odds: t.underOdds!,
          line: t.line,
          fairProbability: null,
          bookmaker: bestBook.bookmaker,
          commenceTime: game.commenceTime,
        },
      })
    }

    return opts
  }, [game])

  return (
    <div className="space-y-6">
      {/* Quick-add from this game */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          Add to Slip
        </h3>
        <div className="flex flex-wrap gap-2">
          {quickOptions.map((opt) => {
            const alreadyAdded = legs.some((l) => l.id === opt.leg.id)
            return (
              <button
                key={opt.leg.id}
                onClick={() => alreadyAdded ? handleRemove(opt.leg.id) : handleAdd(opt.leg)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  alreadyAdded
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-card border-border text-foreground hover:border-primary/50'
                }`}
              >
                {alreadyAdded ? '- ' : '+ '}{opt.label}
              </button>
            )
          })}
          {quickOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">No odds available for this game.</p>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-400">
          {message}
        </div>
      )}

      {/* Current slip */}
      {legs.length > 0 && (
        <div>
          {/* Mode selector */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-1">
              {(['straight', 'parlay'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    mode === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Units:</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={units}
                onChange={(e) => setUnits(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                className="w-16 rounded-md bg-background border border-border px-2 py-1 text-xs"
              />
            </div>
          </div>

          {/* Legs list */}
          <div className="space-y-2">
            {/* Current game legs */}
            {currentGameLegs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">This game</p>
                {currentGameLegs.map((leg) => {
                  const la = analysis.legs.find((a) => a.legId === leg.id)
                  return (
                    <LegRow
                      key={leg.id}
                      leg={leg}
                      ev={la?.ev ?? null}
                      onRemove={() => handleRemove(leg.id)}
                    />
                  )
                })}
              </div>
            )}

            {/* Other game legs */}
            {otherLegs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 mt-3">Other games</p>
                {otherLegs.map((leg) => {
                  const la = analysis.legs.find((a) => a.legId === leg.id)
                  return (
                    <LegRow
                      key={leg.id}
                      leg={leg}
                      ev={la?.ev ?? null}
                      onRemove={() => handleRemove(leg.id)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Analysis summary */}
          <div className="mt-4 rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-medium">{mode === 'parlay' ? 'Parlay' : 'Straight Bets'}</span>
            </div>

            {mode === 'parlay' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Combined Odds</span>
                  <span className="font-medium font-mono">
                    {formatOdds(analysis.combinedAmericanOdds)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Probability</span>
                  <span className="font-medium">
                    {(analysis.combinedImpliedProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Potential Payout</span>
                  <span className="font-medium text-green-400">
                    +{(analysis.parlayPayoutPerUnit * units).toFixed(2)}u
                  </span>
                </div>
                {analysis.parlayEv !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Parlay EV</span>
                    <span className={`font-medium ${evColor(analysis.parlayEv)}`}>
                      {analysis.parlayEv >= 0 ? '+' : ''}{analysis.parlayEv}%
                    </span>
                  </div>
                )}
              </>
            )}

            {mode === 'straight' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Risk</span>
                  <span className="font-medium">{analysis.totalUnitsAtRisk.toFixed(1)}u</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Payout (all win)</span>
                  <span className="font-medium text-green-400">
                    +{analysis.straightTotalPayout.toFixed(2)}u
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Legs</span>
              <span className="font-medium">{analysis.legCount}</span>
            </div>
          </div>

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="mt-3 space-y-2">
              {analysis.warnings.map((w, i) => (
                <div
                  key={i}
                  className={`rounded-md border p-2 text-xs ${severityColor(w.severity)}`}
                >
                  {w.message}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              {copied ? 'Copied!' : 'Copy Slip'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-red-400"
            >
              Clear All
            </Button>
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground">
            For informational purposes only. Not financial advice.
          </p>
        </div>
      )}

      {legs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add picks from the buttons above to build a bet slip. Slip persists across games.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LegRow sub-component
// ---------------------------------------------------------------------------

function LegRow({
  leg,
  ev,
  onRemove,
}: {
  leg: SlipLeg
  ev: number | null
  onRemove: () => void
}) {
  const sideLabel = leg.side === 'over' || leg.side === 'under'
    ? `${leg.side.charAt(0).toUpperCase() + leg.side.slice(1)} ${leg.line ?? ''}`
    : leg.side === 'home' ? leg.homeTeam : leg.awayTeam

  const lineStr = leg.market === 'spread' && leg.line !== null
    ? ` (${leg.line >= 0 ? '+' : ''}${leg.line})`
    : ''

  return (
    <div className="flex items-center justify-between rounded-md bg-card border border-border p-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] shrink-0">
            {leg.sport.toUpperCase()}
          </Badge>
          <span className="text-xs truncate">
            {sideLabel}{lineStr}
          </span>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {formatOdds(leg.odds)}
          </span>
          {ev !== null && (
            <span className={`text-[10px] shrink-0 ${evColor(ev)}`}>
              EV: {ev >= 0 ? '+' : ''}{ev}%
            </span>
          )}
        </div>
        {leg.gameId !== leg.homeTeam && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {leg.awayTeam} @ {leg.homeTeam}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="ml-2 text-muted-foreground hover:text-red-400 text-xs shrink-0"
        title="Remove from slip"
      >
        x
      </button>
    </div>
  )
}
