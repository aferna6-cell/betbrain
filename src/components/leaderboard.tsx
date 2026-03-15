'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { profitColor, winRateColor } from '@/lib/format'
import type { LeaderboardEntry, LeaderboardResult } from '@/lib/leaderboard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SortKey = 'roi' | 'profit' | 'winRate' | 'picks'

function formatProfit(value: number): string {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}`
}

function formatRoi(value: number): string {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

function formatWinRate(value: number): string {
  return `${value.toFixed(1)}%`
}


function streakColor(streak: string): string {
  return streak.startsWith('W') ? 'text-green-500' : 'text-red-500'
}

// Top-3 rank badge backgrounds
function rankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
  if (rank === 2) return 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
  if (rank === 3) return 'bg-orange-700/20 text-orange-400 border border-orange-700/40'
  return 'text-muted-foreground'
}

// ---------------------------------------------------------------------------
// Rank cell
// ---------------------------------------------------------------------------

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(rank)}`}
      >
        {rank}
      </span>
    )
  }
  return <span className="text-muted-foreground">{rank}</span>
}

// ---------------------------------------------------------------------------
// Sort button
// ---------------------------------------------------------------------------

interface SortButtonProps {
  label: string
  value: SortKey
  active: boolean
  onClick: (key: SortKey) => void
}

function SortButton({ label, value, active, onClick }: SortButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={() => onClick(value)}
      className={active ? '' : 'text-muted-foreground'}
    >
      {label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr className="border-b border-border/50 bg-card/50 transition-colors hover:bg-card">
      <td className="px-4 py-3 text-center">
        <RankCell rank={entry.rank} />
      </td>
      <td className="px-4 py-3 font-medium">{entry.displayName}</td>
      <td className="px-4 py-3 font-mono text-sm">
        <span className="text-green-500">{entry.wins}</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-red-500">{entry.losses}</span>
        {entry.pushes > 0 && (
          <>
            <span className="text-muted-foreground">-</span>
            <span className="text-yellow-500">{entry.pushes}</span>
          </>
        )}
      </td>
      <td className={`px-4 py-3 text-right font-medium ${winRateColor(entry.winRate)}`}>
        {formatWinRate(entry.winRate)}
      </td>
      <td className={`px-4 py-3 text-right font-mono ${profitColor(entry.totalProfit)}`}>
        {formatProfit(entry.totalProfit)}u
      </td>
      <td className={`px-4 py-3 text-right font-mono ${profitColor(entry.roi)}`}>
        {formatRoi(entry.roi)}
      </td>
      <td className={`px-4 py-3 text-center font-mono text-sm font-semibold ${streakColor(entry.streak)}`}>
        {entry.streak}
      </td>
      <td className="px-4 py-3 text-center">
        <Badge variant="secondary" className="text-xs">
          {entry.favoriteSport}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
        {entry.totalPicks}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Leaderboard() {
  const [sortBy, setSortBy] = useState<SortKey>('roi')
  const [data, setData] = useState<LeaderboardResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async (sort: SortKey) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/leaderboard?sort=${sort}`)
      if (!response.ok) throw new Error('Failed to load leaderboard')
      const json: LeaderboardResult = await response.json()
      setData(json)
    } catch {
      setError('Failed to load leaderboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard(sortBy)
  }, [fetchLeaderboard, sortBy])

  function handleSort(key: SortKey) {
    setSortBy(key)
  }

  const sortButtons: { label: string; value: SortKey }[] = [
    { label: 'ROI', value: 'roi' },
    { label: 'Profit', value: 'profit' },
    { label: 'Win Rate', value: 'winRate' },
    { label: 'Total Picks', value: 'picks' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Top performers from the BetBrain community. Opt in from your profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortButtons.map((btn) => (
            <SortButton
              key={btn.value}
              label={btn.label}
              value={btn.value}
              active={sortBy === btn.value}
              onClick={handleSort}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {/* Table skeleton */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-center">Rank</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 font-medium text-right">Win Rate</th>
                  <th className="px-4 py-3 font-medium text-right">Profit</th>
                  <th className="px-4 py-3 font-medium text-right">ROI</th>
                  <th className="px-4 py-3 font-medium text-center">Streak</th>
                  <th className="px-4 py-3 font-medium text-center">Sport</th>
                  <th className="px-4 py-3 font-medium text-right">Picks</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50 bg-card/50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-red-500">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => fetchLeaderboard(sortBy)}
          >
            Retry
          </Button>
        </div>
      ) : data && data.entries.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium text-center">Rank</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Record</th>
                <th className="px-4 py-3 font-medium text-right">Win Rate</th>
                <th className="px-4 py-3 font-medium text-right">Profit</th>
                <th className="px-4 py-3 font-medium text-right">ROI</th>
                <th className="px-4 py-3 font-medium text-center">Streak</th>
                <th className="px-4 py-3 font-medium text-center">Sport</th>
                <th className="px-4 py-3 font-medium text-right">Picks</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <LeaderboardRow key={entry.rank} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      ) : data && data.entries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No leaderboard entries yet. Opt in from your Profile page to appear on the leaderboard.
          </p>
        </div>
      ) : null}

      {/* Footer */}
      {data && !loading && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Last updated:{' '}
            {new Date(data.lastUpdated).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            {' '}· {data.totalParticipants} participants
          </p>
          <p className="text-xs text-muted-foreground">
            Want to appear on the leaderboard? Set a display name in your profile.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Stats are based on self-reported picks. BetBrain does not verify outcomes.
          </p>
        </div>
      )}
    </div>
  )
}
