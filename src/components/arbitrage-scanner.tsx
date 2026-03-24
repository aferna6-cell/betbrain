'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { OddsDisplay } from '@/components/odds-display'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { MultiMarketArb, ArbMarket } from '@/lib/ev-scanner'
import type { Sport } from '@/lib/supabase/types'

const SPORT_FILTERS: { key: 'all' | Sport; label: string }[] = [
  { key: 'all', label: 'All Sports' },
  { key: 'nba', label: 'NBA' },
  { key: 'nfl', label: 'NFL' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
]

const MARKET_FILTERS: { key: 'all' | ArbMarket; label: string }[] = [
  { key: 'all', label: 'All Markets' },
  { key: 'moneyline', label: 'Moneyline' },
  { key: 'spread', label: 'Spread' },
  { key: 'total', label: 'Total' },
]

function formatBook(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function MultiArbCard({ arb, customStake }: { arb: MultiMarketArb; customStake: number }) {
  const scaleFactor = customStake / 100
  const stake1 = Math.round(arb.stakes.side1 * scaleFactor * 100) / 100
  const stake2 = Math.round(arb.stakes.side2 * scaleFactor * 100) / 100
  const totalReturn = Math.round(arb.stakes.totalReturn * scaleFactor * 100) / 100
  const guaranteedProfit = Math.round((totalReturn - customStake) * 100) / 100

  const marketColors: Record<ArbMarket, string> = {
    moneyline: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    spread: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    total: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  }

  const borderColor: Record<ArbMarket, string> = {
    moneyline: 'border-yellow-500/30',
    spread: 'border-blue-500/30',
    total: 'border-purple-500/30',
  }

  const bgColor: Record<ArbMarket, string> = {
    moneyline: 'bg-yellow-500/5',
    spread: 'bg-blue-500/5',
    total: 'bg-purple-500/5',
  }

  return (
    <div className={`rounded-lg border ${borderColor[arb.market]} ${bgColor[arb.market]} p-4`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {SPORT_LABELS[arb.game.sport] ?? arb.game.sport.toUpperCase()}
          </Badge>
          <Badge className={`text-xs ${marketColors[arb.market]}`}>
            {arb.market.charAt(0).toUpperCase() + arb.market.slice(1)}
          </Badge>
          <Badge className="bg-green-500/20 text-green-500 text-xs font-bold">
            +{arb.profit}% Guaranteed
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatGameTime(arb.game.commenceTime)}
        </span>
      </div>

      {/* Game info */}
      <p className="mb-3 text-sm font-medium">
        {arb.game.awayTeam} @ {arb.game.homeTeam}
      </p>

      {/* Sides */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2">
          <div>
            <p className="text-sm font-medium">{arb.side1.label}</p>
            <p className="text-xs text-muted-foreground">{formatBook(arb.side1.bookmaker)}</p>
          </div>
          <div className="text-right">
            <OddsDisplay odds={arb.side1.odds} className="font-mono font-bold text-sm" />
            <p className="text-xs text-muted-foreground">
              {(arb.side1.implied * 100).toFixed(1)}% implied
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2">
          <div>
            <p className="text-sm font-medium">{arb.side2.label}</p>
            <p className="text-xs text-muted-foreground">{formatBook(arb.side2.bookmaker)}</p>
          </div>
          <div className="text-right">
            <OddsDisplay odds={arb.side2.odds} className="font-mono font-bold text-sm" />
            <p className="text-xs text-muted-foreground">
              {(arb.side2.implied * 100).toFixed(1)}% implied
            </p>
          </div>
        </div>
      </div>

      {/* Stake calculator */}
      <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2">
        <p className="mb-1 text-xs font-semibold text-green-500">
          Stake Split (${customStake} total)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">{arb.side1.label.split(' ')[0]}:</span>{' '}
            <span className="font-mono font-medium">${stake1.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{arb.side2.label.split(' ')[0]}:</span>{' '}
            <span className="font-mono font-medium">${stake2.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-green-500/10 pt-1 text-xs">
          <span className="text-muted-foreground">Guaranteed return:</span>
          <span className="font-mono font-bold text-green-500">${totalReturn.toFixed(2)} (+${guaranteedProfit.toFixed(2)})</span>
        </div>
      </div>

      {/* Combined implied */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Combined implied: {(arb.totalImplied * 100).toFixed(2)}%</span>
        <Link
          href={`/dashboard/games/${arb.game.id}`}
          className="text-primary hover:underline"
        >
          View Game
        </Link>
      </div>
    </div>
  )
}

export function ArbitrageScannerView({
  arbs,
  gamesScanned,
}: {
  arbs: MultiMarketArb[]
  gamesScanned: number
}) {
  const [activeSport, setActiveSport] = useState<'all' | Sport>('all')
  const [activeMarket, setActiveMarket] = useState<'all' | ArbMarket>('all')
  const [stakeAmount, setStakeAmount] = useState<number>(100)

  const filtered = arbs
    .filter((a) => activeSport === 'all' || a.game.sport === activeSport)
    .filter((a) => activeMarket === 'all' || a.market === activeMarket)

  const totalProfit = filtered.reduce((sum, a) => sum + a.profit, 0)
  const marketCounts = {
    moneyline: arbs.filter((a) => a.market === 'moneyline').length,
    spread: arbs.filter((a) => a.market === 'spread').length,
    total: arbs.filter((a) => a.market === 'total').length,
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{arbs.length}</p>
          <p className="text-xs text-muted-foreground">Active Arbs</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-500">
            {arbs.length > 0 ? `+${(totalProfit / filtered.length || 0).toFixed(2)}%` : '--'}
          </p>
          <p className="text-xs text-muted-foreground">Avg Profit</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{gamesScanned}</p>
          <p className="text-xs text-muted-foreground">Games Scanned</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-lg font-bold">
            <span className="text-yellow-500">{marketCounts.moneyline}</span>
            {' / '}
            <span className="text-blue-500">{marketCounts.spread}</span>
            {' / '}
            <span className="text-purple-500">{marketCounts.total}</span>
          </p>
          <p className="text-xs text-muted-foreground">ML / Spread / Total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {SPORT_FILTERS.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setActiveSport(sf.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSport === sf.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {MARKET_FILTERS.map((mf) => (
            <button
              key={mf.key}
              onClick={() => setActiveMarket(mf.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeMarket === mf.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {mf.label}
            </button>
          ))}
        </div>

        {/* Stake input */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Stake: $</label>
          <input
            type="number"
            min={1}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(Math.max(1, parseInt(e.target.value) || 100))}
            className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm font-mono"
          />
        </div>
      </div>

      {/* Arb cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((arb, i) => (
            <MultiArbCard key={`${arb.game.id}-${arb.market}-${i}`} arb={arb} customStake={stakeAmount} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">
            {arbs.length === 0
              ? 'No arbitrage opportunities detected'
              : 'No arbs match current filters'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Arbitrage opportunities occur when bookmaker odds diverge enough that betting both sides
            guarantees a profit. These are rare and typically short-lived.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice. Arbitrage opportunities may disappear
        before execution. Verify odds at each bookmaker before placing bets.
      </p>
    </div>
  )
}
