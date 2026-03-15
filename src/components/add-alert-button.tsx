'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatOdds } from '@/lib/odds'

interface AddAlertButtonProps {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
}

export function AddAlertButton({
  gameId,
  sport,
  homeTeam,
  awayTeam,
}: AddAlertButtonProps) {
  const [open, setOpen] = useState(false)
  const [market, setMarket] = useState<'moneyline' | 'spreads' | 'totals'>('moneyline')
  const [side, setSide] = useState<'home' | 'away'>('home')
  const [condition, setCondition] = useState<'above' | 'below'>('below')
  const [threshold, setThreshold] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const parsed = Number(threshold)
    if (isNaN(parsed)) {
      setError('Enter a valid odds number')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalGameId: gameId,
          sport,
          team: side === 'home' ? homeTeam : awayTeam,
          side,
          market,
          condition,
          threshold: parsed,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create alert')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setThreshold('')
      }, 1500)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Set Alert
      </Button>
    )
  }

  if (success) {
    return (
      <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3">
        <p className="text-sm text-green-500">Alert created!</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Alert me when:
      </p>
      <div className="flex gap-2 flex-wrap items-center">
        <label htmlFor="alert-side" className="sr-only">Team</label>
        <select
          id="alert-side"
          value={side}
          onChange={(e) => setSide(e.target.value as 'home' | 'away')}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="home">{homeTeam}</option>
          <option value="away">{awayTeam}</option>
        </select>
        <label htmlFor="alert-market" className="sr-only">Market</label>
        <select
          id="alert-market"
          value={market}
          onChange={(e) => setMarket(e.target.value as 'moneyline' | 'spreads' | 'totals')}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="moneyline">Moneyline</option>
          <option value="spreads">Spread</option>
          <option value="totals">Total</option>
        </select>
        <span className="flex items-center text-xs text-muted-foreground" aria-hidden="true">
          goes
        </span>
        <label htmlFor="alert-condition" className="sr-only">Condition</label>
        <select
          id="alert-condition"
          value={condition}
          onChange={(e) =>
            setCondition(e.target.value as 'above' | 'below')
          }
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="above">above</option>
          <option value="below">below</option>
        </select>
        <label htmlFor="alert-threshold" className="sr-only">Threshold</label>
        <input
          id="alert-threshold"
          type="number"
          step={market === 'moneyline' ? '1' : '0.5'}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder={market === 'moneyline' ? formatOdds(-150) : market === 'spreads' ? '-5.5' : '220.5'}
          className="h-8 w-20 rounded-md border border-border bg-background px-2 text-xs font-mono"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={loading || !threshold}
          className="text-xs"
        >
          {loading ? 'Creating...' : 'Create Alert'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(false)}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
