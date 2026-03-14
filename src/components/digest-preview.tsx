'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DigestContent } from '@/lib/digest'

const SPORT_LABELS: Record<string, string> = {
  nba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  nhl: 'NHL',
}

function formatOdds(price: number | null): string {
  if (price === null) return '—'
  return price > 0 ? `+${price}` : `${price}`
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function DigestPreview({ digest }: { digest: DigestContent }) {
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const handleSend = async () => {
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/digest', { method: 'POST' })
      const data = await res.json()
      setSendResult(
        data.sent
          ? 'Digest sent to your email!'
          : 'Email sending not configured yet. Preview is shown below.'
      )
    } catch {
      setSendResult('Failed to send digest.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Daily Digest</h2>
          <Badge variant="outline" className="font-mono text-xs">
            {digest.date}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {digest.totalGames} games
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {sendResult && (
            <span className="text-xs text-muted-foreground">{sendResult}</span>
          )}
          <Button size="sm" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send to Email'}
          </Button>
        </div>
      </div>

      {/* Smart Signals */}
      {digest.smartSignals.total > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-semibold">Smart Signals</h3>
            <Badge variant="default">{digest.smartSignals.total}</Badge>
            {digest.smartSignals.strong > 0 && (
              <span className="text-xs text-muted-foreground">
                {digest.smartSignals.strong} strong
              </span>
            )}
          </div>
          <div className="space-y-2">
            {digest.smartSignals.items.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={s.strength === 'strong' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {s.strength}
                  </Badge>
                  <span className="text-sm">
                    {s.awayTeam} @ {s.homeTeam}
                  </span>
                  <Badge variant="secondary" className="text-xs uppercase">
                    {SPORT_LABELS[s.sport] ?? s.sport}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {s.valueSide && (
                    <span className="text-green-500">
                      Value: {s.valueSide}
                    </span>
                  )}
                  {s.confidence && (
                    <span>AI: {s.confidence}%</span>
                  )}
                  <span>{s.signalCount} signals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Significant Line Moves */}
      {digest.significantMoves.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-semibold">Significant Line Moves</h3>
            <Badge variant="secondary">{digest.significantMoves.length}</Badge>
          </div>
          <div className="space-y-1">
            {digest.significantMoves.slice(0, 10).map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs uppercase">
                    {SPORT_LABELS[m.sport] ?? m.sport}
                  </Badge>
                  <span>
                    {m.awayTeam} @ {m.homeTeam}
                  </span>
                </div>
                <span className="font-mono text-xs text-yellow-500">
                  {m.side} ML varies {m.variance} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Games by Sport */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Today&apos;s Games</h3>
        {Object.entries(digest.gamesBySport).map(([sport, games]) => (
          <div key={sport} className="mb-4 last:mb-0">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs uppercase">
                {SPORT_LABELS[sport] ?? sport}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {games.length} game{games.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1">
              {games.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-muted-foreground">
                      {formatTime(g.commenceTime)}
                    </span>
                    <span>
                      {g.awayTeam} @ {g.homeTeam}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span>{formatOdds(g.bestAwayOdds)}</span>
                    <span>{formatOdds(g.bestHomeOdds)}</span>
                    <span className="text-muted-foreground">
                      ({g.bookmakerCount} books)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs italic text-muted-foreground">
        {digest.disclaimer}
      </p>
    </div>
  )
}
