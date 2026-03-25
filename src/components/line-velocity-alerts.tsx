'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  createPresetRules,
  evaluateMovements,
  formatAlertMessage,
  getPriorityBadgeClass,
  type VelocityAlertRule,
  type VelocityAlertEvent,
  type OddsMovement,
} from '@/lib/line-velocity-alerts'

const STORAGE_KEY = 'betbrain_velocity_rules'
const ALERTS_KEY = 'betbrain_velocity_alerts'

function loadRules(): VelocityAlertRule[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
    // Initialize with presets
    const presets = createPresetRules()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
    return presets
  } catch {
    return createPresetRules()
  }
}

function saveRules(rules: VelocityAlertRule[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  } catch { /* storage full */ }
}

function loadAlerts(): VelocityAlertEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(ALERTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveAlerts(alerts: VelocityAlertEvent[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
  } catch { /* storage full */ }
}

// ---------------------------------------------------------------------------
// Rule list
// ---------------------------------------------------------------------------

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: VelocityAlertRule
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border border-border p-3 ${
      rule.enabled ? 'bg-card' : 'bg-card/50 opacity-60'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{rule.name}</p>
        <p className="text-xs text-muted-foreground">
          {rule.market.toUpperCase()} &bull; {rule.threshold} pt threshold &bull;{' '}
          {rule.window}min window &bull; {rule.minBooks}+ books
          {rule.sports.length > 0 && ` • ${rule.sports.map(s => s.toUpperCase()).join(', ')}`}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={onToggle}
          className={`text-xs px-2 py-1 rounded ${
            rule.enabled ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'
          }`}
        >
          {rule.enabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alert card
// ---------------------------------------------------------------------------

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: VelocityAlertEvent
  onDismiss: () => void
}) {
  const timeAgo = (() => {
    const diff = Date.now() - new Date(alert.firedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  })()

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={`text-xs ${getPriorityBadgeClass(alert.priority)}`}>
            {alert.priority.toUpperCase()}
          </Badge>
          <Badge variant="secondary" className="text-xs uppercase">
            {alert.sport}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>
        </div>
        <p className="text-sm">{formatAlertMessage(alert)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Rule: {alert.ruleName} &bull; Velocity: {alert.velocityPerHour.toFixed(0)} pts/hr
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Dismiss
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LineVelocityAlerts({
  movements = [],
}: {
  movements?: OddsMovement[]
}) {
  const [rules, setRules] = useState<VelocityAlertRule[]>([])
  const [alerts, setAlerts] = useState<VelocityAlertEvent[]>([])
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    setRules(loadRules())
    setAlerts(loadAlerts())
  }, [])

  // Evaluate movements against rules when movements change
  useEffect(() => {
    if (movements.length === 0 || rules.length === 0) return

    const newAlerts = evaluateMovements(movements, rules, alerts)
    if (newAlerts.length > 0) {
      const updated = [...newAlerts, ...alerts].slice(0, 50) // Keep last 50
      setAlerts(updated)
      saveAlerts(updated)
    }
  }, [movements]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleRule(id: string) {
    const updated = rules.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    )
    setRules(updated)
    saveRules(updated)
  }

  function deleteRule(id: string) {
    const updated = rules.filter(r => r.id !== id)
    setRules(updated)
    saveRules(updated)
  }

  function dismissAlert(id: string) {
    const updated = alerts.map(a =>
      a.id === id ? { ...a, dismissed: true } : a
    )
    setAlerts(updated)
    saveAlerts(updated)
  }

  function clearDismissed() {
    const updated = alerts.filter(a => !a.dismissed)
    setAlerts(updated)
    saveAlerts(updated)
  }

  const activeAlerts = alerts.filter(a => !a.dismissed)
  const enabledRules = rules.filter(r => r.enabled)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Line Velocity Alerts</h3>
          <p className="text-xs text-muted-foreground">
            {enabledRules.length} active rule{enabledRules.length !== 1 ? 's' : ''} &bull;{' '}
            {activeAlerts.length} alert{activeAlerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRules(!showRules)}
        >
          {showRules ? 'Hide Rules' : 'Manage Rules'}
        </Button>
      </div>

      {/* Rules panel */}
      {showRules && (
        <div className="space-y-2 rounded-lg border border-border p-3 bg-background">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Alert Rules</h4>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules configured.</p>
          ) : (
            rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onDelete={() => deleteRule(rule.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Active alerts */}
      {activeAlerts.length > 0 ? (
        <div className="space-y-2">
          {activeAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))}
          {alerts.some(a => a.dismissed) && (
            <button
              onClick={clearDismissed}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear dismissed alerts
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No velocity alerts right now. Lines are moving normally.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Alerts fire when line movement exceeds your configured thresholds.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
