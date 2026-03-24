'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  checkMilestones,
  type BankrollSnapshot,
  type MilestoneCheckResult,
} from '@/lib/bankroll-milestones'

const STORAGE_KEY = 'betbrain-bankroll-milestones-ack'

export function BankrollMilestonesPanel() {
  const [snapshots, setSnapshots] = useState<BankrollSnapshot[]>([])
  const [startingBankroll, setStartingBankroll] = useState(0)
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      // Read bankroll snapshots from journal entries
      const raw = localStorage.getItem('betbrain-journal')
      if (raw) {
        const entries = JSON.parse(raw)
        const snaps: BankrollSnapshot[] = entries
          .filter((e: { bankroll?: number; date: string }) => e.bankroll)
          .map((e: { bankroll: number; date: string }) => ({
            date: e.date,
            balance: e.bankroll,
          }))
        setSnapshots(snaps)
      }

      // Read starting bankroll from config
      const config = localStorage.getItem('betbrain-bankroll-config')
      if (config) {
        const parsed = JSON.parse(config)
        setStartingBankroll(parsed.starting || parsed.bankroll || 1000)
      } else {
        setStartingBankroll(1000) // Default
      }

      // Read acknowledged milestones
      const ackRaw = localStorage.getItem(STORAGE_KEY)
      if (ackRaw) setAcknowledged(new Set(JSON.parse(ackRaw)))
    } catch { /* empty */ }
  }, [])

  const result = useMemo(
    () => checkMilestones(snapshots, startingBankroll, acknowledged),
    [snapshots, startingBankroll, acknowledged]
  )

  const handleAcknowledge = (label: string) => {
    const newAck = new Set(acknowledged)
    newAck.add(label)
    setAcknowledged(newAck)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newAck]))
    } catch { /* empty */ }
  }

  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Bankroll Milestones</h3>
        <p className="text-sm text-muted-foreground">
          Track bankroll in your journal to see milestone alerts and growth tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Bankroll Milestones</h3>
        <p className="text-sm text-muted-foreground">
          Track your bankroll growth against key milestones.
        </p>
      </div>

      {/* Current stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-2xl font-bold">${result.currentBankroll.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Current</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className={`text-2xl font-bold ${result.growthPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {result.growthPct >= 0 ? '+' : ''}{result.growthPct}%
          </div>
          <div className="text-xs text-muted-foreground">Growth</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-2xl font-bold">${result.allTimeHigh.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">ATH</div>
        </div>
      </div>

      {/* New milestone alerts */}
      {result.newlyReached.length > 0 && (
        <div className="space-y-2">
          {result.newlyReached.map((milestone) => (
            <div
              key={milestone.label}
              className={`flex items-center justify-between rounded-md p-3 ${
                milestone.type === 'drawdown'
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-green-500/10 border border-green-500/30'
              }`}
            >
              <div>
                <div className={`text-sm font-medium ${
                  milestone.type === 'drawdown' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {milestone.type === 'ath' ? 'New All-Time High!' : milestone.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${milestone.currentValue.toFixed(2)}
                  {milestone.reachedDate && ` on ${milestone.reachedDate}`}
                </div>
              </div>
              <button
                onClick={() => handleAcknowledge(milestone.label)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Next milestone */}
      {result.nextMilestone && (
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">Next: {result.nextMilestone.label}</span>
            <span className="text-xs text-muted-foreground">
              ${result.nextMilestone.threshold.toFixed(0)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${result.nextMilestone.progress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {result.nextMilestone.progress}%
          </div>
        </div>
      )}

      {/* Milestone list */}
      <div className="space-y-1">
        {result.milestones
          .filter((m) => m.type === 'growth')
          .map((milestone) => (
            <div
              key={milestone.label}
              className="flex items-center gap-2 text-xs"
            >
              <span className={milestone.reached ? 'text-green-400' : 'text-zinc-500'}>
                {milestone.reached ? '[x]' : '[ ]'}
              </span>
              <span className={milestone.reached ? '' : 'text-muted-foreground'}>
                {milestone.label}
              </span>
              <span className="text-muted-foreground ml-auto">
                ${milestone.threshold.toFixed(0)}
              </span>
            </div>
          ))}
      </div>

      {/* Drawdown */}
      {result.drawdownFromATH > 0 && (
        <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3">
          <div className="text-xs text-muted-foreground">Current Drawdown from ATH</div>
          <div className="text-lg font-bold text-red-400">
            -{result.drawdownFromATH}%
          </div>
        </div>
      )}
    </div>
  )
}
