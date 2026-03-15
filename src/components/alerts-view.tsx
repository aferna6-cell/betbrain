'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatOdds } from '@/lib/odds'

interface AlertRule {
  id: string
  external_game_id: string
  sport: string
  team: string
  side: 'home' | 'away'
  condition: 'above' | 'below'
  threshold: number
  triggered: boolean
  triggered_at: string | null
  triggered_value: number | null
  created_at: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function AlertCard({
  alert,
  onDelete,
}: {
  alert: AlertRule
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert.triggered
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs uppercase">
            {alert.sport}
          </Badge>
          {alert.triggered ? (
            <Badge variant="default" className="text-xs">
              Triggered
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Active
            </Badge>
          )}
        </div>
        <button
          onClick={() => onDelete(alert.id)}
          aria-label={`Delete alert for ${alert.team}`}
          className="text-xs text-muted-foreground hover:text-red-500"
        >
          Delete
        </button>
      </div>

      <div className="mt-2">
        <p className="text-sm font-medium">{alert.team}</p>
        <p className="text-xs text-muted-foreground">
          Moneyline goes {alert.condition}{' '}
          <span className="font-mono">{formatOdds(alert.threshold)}</span>
        </p>
      </div>

      {alert.triggered && alert.triggered_value !== null && (
        <div className="mt-2 rounded-md bg-green-500/10 px-3 py-1.5">
          <p className="text-xs text-green-500">
            Triggered at{' '}
            <span className="font-mono">
              {formatOdds(alert.triggered_value)}
            </span>
            {alert.triggered_at && (
              <span className="text-muted-foreground">
                {' '}
                — {formatDate(alert.triggered_at)}
              </span>
            )}
          </p>
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Created {formatDate(alert.created_at)}
      </p>
    </div>
  )
}

export function AlertsView() {
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCount, setActiveCount] = useState(0)
  const [triggeredCount, setTriggeredCount] = useState(0)

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts ?? [])
        setActiveCount(data.active ?? 0)
        setTriggeredCount(data.triggered ?? 0)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  async function handleDelete(alertId: string) {
    const res = await fetch(`/api/alerts?id=${alertId}`, { method: 'DELETE' })
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading alerts...</p>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-lg font-medium">No alerts set</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Go to a game detail page and set alerts on specific odds thresholds.
          You&apos;ll see triggered alerts here.
        </p>
      </div>
    )
  }

  const active = alerts.filter((a) => !a.triggered)
  const triggered = alerts.filter((a) => a.triggered)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Badge variant="outline">{activeCount} Active</Badge>
        <Badge variant="default">{triggeredCount} Triggered</Badge>
      </div>

      {triggered.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Triggered Alerts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {triggered.map((a) => (
              <AlertCard key={a.id} alert={a} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Active Alerts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((a) => (
              <AlertCard key={a.id} alert={a} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
