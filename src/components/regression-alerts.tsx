'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  detectRegressions,
  loadRegressionConfig,
  saveRegressionConfig,
  DEFAULT_CONFIG,
  type RegressionAlert,
  type RegressionConfig,
} from '@/lib/regression-alerts'
import { notifyRegressionWarning } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Alert display
// ---------------------------------------------------------------------------

function AlertCard({ alert }: { alert: RegressionAlert }) {
  const isCritical = alert.severity === 'critical'

  return (
    <div
      className={`rounded-lg border p-4 ${
        isCritical
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-yellow-500/30 bg-yellow-500/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{isCritical ? '\u26A0\uFE0F' : '\u26A0\uFE0F'}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{alert.title}</p>
            <Badge
              variant={isCritical ? 'destructive' : 'outline'}
              className="text-[10px]"
            >
              {alert.severity}
            </Badge>
          </div>
          <p className="text-sm mt-0.5">{alert.message}</p>
          <p className="text-xs text-muted-foreground mt-1">{alert.detail}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Config editor
// ---------------------------------------------------------------------------

function ConfigEditor({
  config,
  onSave,
  onClose,
}: {
  config: RegressionConfig
  onSave: (c: RegressionConfig) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(config)

  function setField(key: keyof RegressionConfig, value: string) {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">Regression Alert Settings</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">ROI Floor (%)</label>
          <input
            type="number"
            value={form.roiFloor}
            onChange={(e) => setField('roiFloor', e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Alert when trailing ROI falls below this</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">ROI Window (picks)</label>
          <input
            type="number"
            value={form.roiWindow}
            onChange={(e) => setField('roiWindow', e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Losing Streak Threshold</label>
          <input
            type="number"
            value={form.losingStreakThreshold}
            onChange={(e) => setField('losingStreakThreshold', e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Alert after N consecutive losses</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Unit Drain Threshold</label>
          <input
            type="number"
            value={form.unitDrainThreshold}
            onChange={(e) => setField('unitDrainThreshold', e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Alert when units lost exceed this</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)}>Save</Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setForm(DEFAULT_CONFIG)
            onSave(DEFAULT_CONFIG)
          }}
        >
          Reset Defaults
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RegressionAlertsPanelProps {
  picks: Array<{
    outcome?: string | null
    profit?: number | null
    units: number
    sport: string
    created_at: string
  }>
}

export function RegressionAlertsPanel({ picks }: RegressionAlertsPanelProps) {
  const [alerts, setAlerts] = useState<RegressionAlert[]>([])
  const [config, setConfig] = useState<RegressionConfig>(DEFAULT_CONFIG)
  const [showConfig, setShowConfig] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const cfg = loadRegressionConfig()
    setConfig(cfg)
    const detected = detectRegressions(picks, cfg)
    setAlerts(detected)

    // Push to notification center
    for (const alert of detected) {
      if (alert.type === 'roi_drop' || alert.type === 'losing_streak') {
        notifyRegressionWarning(alert.type, alert.message)
      }
    }
  }, [picks])

  function handleSaveConfig(newConfig: RegressionConfig) {
    saveRegressionConfig(newConfig)
    setConfig(newConfig)
    setAlerts(detectRegressions(picks, newConfig))
    setShowConfig(false)
  }

  if (alerts.length === 0) return null
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
      >
        {alerts.length} regression alert{alerts.length > 1 ? 's' : ''} (show)
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Regression Alerts
          <Badge variant="destructive" className="text-[10px]">
            {alerts.length}
          </Badge>
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowConfig(!showConfig)}>
            Settings
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        </div>
      </div>

      {showConfig && (
        <ConfigEditor
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <AlertCard key={`${alert.type}-${i}`} alert={alert} />
        ))}
      </div>
    </div>
  )
}
