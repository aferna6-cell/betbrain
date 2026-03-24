'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  calculatePayout,
  calculateHedge,
  calculateParlay,
  expectedValue,
  winsNeededToProfit,
} from '@/lib/bet-calculator'
import { kellyCriterion } from '@/lib/bankroll'

// ---------------------------------------------------------------------------
// Bet Calculator — all-in-one payout, hedge, parlay, and EV calculator
// ---------------------------------------------------------------------------

export function BetCalculator() {
  const [activeTab, setActiveTab] = useState<'single' | 'hedge' | 'parlay'>('single')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Bet Calculator</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Calculate payouts, hedge bets, and parlay odds. All calculations use standard American odds.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        {(['single', 'hedge', 'parlay'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'single' ? 'Single Bet' : tab === 'hedge' ? 'Hedge Bet' : 'Parlay'}
          </button>
        ))}
      </div>

      {activeTab === 'single' && <SingleBetCalc />}
      {activeTab === 'hedge' && <HedgeBetCalc />}
      {activeTab === 'parlay' && <ParlayCalc />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single Bet Calculator
// ---------------------------------------------------------------------------

function SingleBetCalc() {
  const [wager, setWager] = useState(100)
  const [odds, setOdds] = useState(-110)
  const [winProb, setWinProb] = useState(55)

  const payout = useMemo(() => calculatePayout(wager, odds), [wager, odds])
  const ev = useMemo(() => expectedValue(winProb / 100, odds), [winProb, odds])
  const kelly = useMemo(() => kellyCriterion(winProb / 100, odds), [winProb, odds])
  const winsNeeded = useMemo(() => winsNeededToProfit(100, odds), [odds])

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Wager ($)
          </label>
          <input
            type="number"
            value={wager}
            onChange={(e) => setWager(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Odds (American)
          </label>
          <input
            type="number"
            value={odds}
            onChange={(e) => setOdds(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Est. Win % (for EV calc)
          </label>
          <input
            type="number"
            value={winProb}
            min={1}
            max={99}
            onChange={(e) => setWinProb(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard label="Profit" value={`$${payout.profit.toFixed(2)}`} color="green" />
        <ResultCard label="Total Payout" value={`$${payout.totalPayout.toFixed(2)}`} />
        <ResultCard label="Decimal Odds" value={payout.decimalOdds.toFixed(3)} />
        <ResultCard
          label="Implied Prob"
          value={`${(payout.impliedProbability * 100).toFixed(1)}%`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard
          label="Expected Value"
          value={`${ev >= 0 ? '+' : ''}${(ev * 100).toFixed(2)}%`}
          color={ev >= 0 ? 'green' : 'red'}
        />
        <ResultCard
          label="Kelly Fraction"
          value={kelly > 0 ? `${(kelly * 100).toFixed(2)}%` : 'No bet'}
          color={kelly > 0 ? 'green' : 'muted'}
        />
        <ResultCard
          label="Break-Even Win Rate"
          value={`${(payout.breakEvenRate * 100).toFixed(1)}%`}
        />
        <ResultCard
          label="Wins Needed / 100"
          value={`${winsNeeded}`}
        />
      </div>

      {/* EV verdict */}
      <div className={`rounded-lg border p-4 ${ev >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <div className="flex items-center gap-2">
          <Badge className={ev >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
            {ev >= 0 ? '+EV' : '-EV'}
          </Badge>
          <span className="text-sm">
            {ev >= 0
              ? `At ${winProb}% win rate, this bet has positive expected value. For every $1 wagered, you expect to earn $${(ev).toFixed(4)}.`
              : `At ${winProb}% win rate, this bet has negative expected value. You need >${(payout.breakEvenRate * 100).toFixed(1)}% win rate to profit.`
            }
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hedge Bet Calculator
// ---------------------------------------------------------------------------

function HedgeBetCalc() {
  const [originalWager, setOriginalWager] = useState(100)
  const [originalOdds, setOriginalOdds] = useState(200)
  const [hedgeOdds, setHedgeOdds] = useState(-150)

  const hedge = useMemo(
    () => calculateHedge(originalWager, originalOdds, hedgeOdds),
    [originalWager, originalOdds, hedgeOdds]
  )

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Calculate how much to bet on the other side to lock in a guaranteed profit (or minimize loss).
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Original Wager ($)
          </label>
          <input
            type="number"
            value={originalWager}
            onChange={(e) => setOriginalWager(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Original Odds
          </label>
          <input
            type="number"
            value={originalOdds}
            onChange={(e) => setOriginalOdds(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Hedge Odds (other side)
          </label>
          <input
            type="number"
            value={hedgeOdds}
            onChange={(e) => setHedgeOdds(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard label="Hedge Wager" value={`$${hedge.hedgeWager.toFixed(2)}`} color="blue" />
        <ResultCard
          label="Guaranteed Profit"
          value={`$${hedge.guaranteedProfit.toFixed(2)}`}
          color={hedge.guaranteedProfit >= 0 ? 'green' : 'red'}
        />
        <ResultCard label="Total Outlay" value={`$${hedge.totalOutlay.toFixed(2)}`} />
        <ResultCard label="ROI" value={`${hedge.roi.toFixed(2)}%`} color={hedge.roi > 0 ? 'green' : 'red'} />
      </div>

      {/* Outcome scenarios */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">If Original Wins</h4>
          <p className="text-lg font-bold font-mono">
            Payout: ${hedge.ifOriginalWins.payout.toFixed(2)}
          </p>
          <p className={`text-sm font-mono ${hedge.ifOriginalWins.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Profit: ${hedge.ifOriginalWins.profit.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">If Hedge Wins</h4>
          <p className="text-lg font-bold font-mono">
            Payout: ${hedge.ifHedgeWins.payout.toFixed(2)}
          </p>
          <p className={`text-sm font-mono ${hedge.ifHedgeWins.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Profit: ${hedge.ifHedgeWins.profit.toFixed(2)}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parlay Calculator
// ---------------------------------------------------------------------------

function ParlayCalc() {
  const [wager, setWager] = useState(100)
  const [legs, setLegs] = useState<number[]>([-110, -110])

  function addLeg() {
    setLegs([...legs, -110])
  }

  function removeLeg(idx: number) {
    if (legs.length <= 2) return
    setLegs(legs.filter((_, i) => i !== idx))
  }

  function updateLeg(idx: number, value: number) {
    setLegs(legs.map((l, i) => (i === idx ? value : l)))
  }

  const parlay = useMemo(() => calculateParlay(wager, legs), [wager, legs])

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Calculate combined parlay odds and payouts. Add legs and see the total.
      </div>

      {/* Wager */}
      <div className="max-w-xs">
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Wager ($)
        </label>
        <input
          type="number"
          value={wager}
          onChange={(e) => setWager(Number(e.target.value))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
        />
      </div>

      {/* Legs */}
      <div className="space-y-2">
        {legs.map((leg, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16">Leg {idx + 1}</span>
            <input
              type="number"
              value={leg}
              onChange={(e) => updateLeg(idx, Number(e.target.value))}
              className="flex-1 max-w-[200px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              placeholder="American odds"
            />
            <span className="text-xs text-muted-foreground w-16">
              {(parlay.legs[idx]?.impliedProbability * 100 || 0).toFixed(1)}%
            </span>
            {legs.length > 2 && (
              <button
                onClick={() => removeLeg(idx)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLeg}>
          + Add Leg
        </Button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ResultCard
          label="Parlay Odds"
          value={`${parlay.combinedAmericanOdds > 0 ? '+' : ''}${parlay.combinedAmericanOdds}`}
          color="green"
        />
        <ResultCard label="Decimal Odds" value={parlay.combinedDecimalOdds.toFixed(3)} />
        <ResultCard
          label="Profit"
          value={`$${parlay.profit.toFixed(2)}`}
          color="green"
        />
        <ResultCard label="Total Payout" value={`$${parlay.totalPayout.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label="Win Probability"
          value={`${(parlay.combinedImpliedProbability * 100).toFixed(2)}%`}
          color={parlay.combinedImpliedProbability > 0.1 ? 'muted' : 'red'}
        />
        <ResultCard
          label="Legs"
          value={`${legs.length}`}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared result card
// ---------------------------------------------------------------------------

function ResultCard({
  label,
  value,
  color = 'default',
}: {
  label: string
  value: string
  color?: 'green' | 'red' | 'blue' | 'muted' | 'default'
}) {
  const colorClass = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
    muted: 'text-muted-foreground',
    default: '',
  }[color]

  return (
    <div className="rounded-lg border border-border/50 bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold font-mono mt-1 ${colorClass}`}>{value}</p>
    </div>
  )
}
