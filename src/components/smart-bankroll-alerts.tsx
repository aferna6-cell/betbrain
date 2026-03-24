'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  checkAllBankrollAlerts,
  loadConfig,
  saveConfig,
  loadAlerts,
  dismissAlert,
  clearAlerts,
  type BankrollAlert,
  type BankrollAlertConfig,
} from '@/lib/smart-bankroll-alerts'

const SEVERITY_STYLES = {
  info: 'border-blue-500/30 bg-blue-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  critical: 'border-red-500/30 bg-red-500/10',
}

const SEVERITY_ICONS = {
  info: 'text-blue-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
}

function AlertCard({ alert, onDismiss }: { alert: BankrollAlert; onDismiss: () => void }) {
  return (
    <div className={`rounded-lg border p-4 ${SEVERITY_STYLES[alert.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className={`text-lg ${SEVERITY_ICONS[alert.severity]}`}>
            {alert.severity === 'critical' ? '!!' : alert.severity === 'warning' ? '!' : 'i'}
          </span>
          <div>
            <h4 className="text-sm font-medium text-white">{alert.title}</h4>
            <p className="text-xs text-zinc-400 mt-1">{alert.message}</p>
            <p className="text-xs text-emerald-400/80 bg-emerald-500/5 rounded px-2 py-1 mt-2">
              {alert.recommendation}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export function SmartBankrollAlerts() {
  const [alerts, setAlerts] = useState<BankrollAlert[]>([])
  const [config, setConfig] = useState<BankrollAlertConfig>(loadConfig())
  const [showConfig, setShowConfig] = useState(false)

  const refresh = useCallback(() => {
    try {
      const raw = localStorage.getItem('betbrain_picks')
      const bankrollRaw = localStorage.getItem('betbrain_bankroll_config')
      const bankroll = bankrollRaw
        ? JSON.parse(bankrollRaw).startingBalance ?? 1000
        : 1000
      const picks = raw ? JSON.parse(raw) : []

      const newAlerts = checkAllBankrollAlerts(picks, bankroll, config)
      // Merge with existing non-dismissed
      const existing = loadAlerts().filter((a) => !a.dismissed)
      const all = [...existing]
      for (const a of newAlerts) {
        if (!all.find((e) => e.type === a.type)) {
          all.push(a)
        }
      }
      setAlerts(all.filter((a) => !a.dismissed))
    } catch {
      // ignore
    }
  }, [config])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleDismiss = (id: string) => {
    dismissAlert(id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const handleClearAll = () => {
    clearAlerts()
    setAlerts([])
  }

  const handleSaveConfig = () => {
    saveConfig(config)
    setShowConfig(false)
    refresh()
  }

  const activeAlerts = alerts.filter((a) => !a.dismissed)

  if (activeAlerts.length === 0 && !showConfig) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">OK</span>
            <div>
              <p className="text-sm text-white">No Active Alerts</p>
              <p className="text-xs text-zinc-500">Bankroll health checks are normal.</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfig(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Configure
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Alert header */}
      {activeAlerts.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showConfig ? 'Hide Config' : 'Configure'}
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {activeAlerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onDismiss={() => handleDismiss(alert.id)} />
      ))}

      {/* Config panel */}
      {showConfig && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">Alert Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Max Daily Loss %</label>
              <input
                type="number"
                value={config.maxDailyLossPercent}
                onChange={(e) => setConfig({ ...config, maxDailyLossPercent: parseFloat(e.target.value) || 5 })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Max Consecutive Losses</label>
              <input
                type="number"
                value={config.maxConsecutiveLosses}
                onChange={(e) => setConfig({ ...config, maxConsecutiveLosses: parseInt(e.target.value) || 5 })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Drawdown Threshold %</label>
              <input
                type="number"
                value={config.drawdownThreshold}
                onChange={(e) => setConfig({ ...config, drawdownThreshold: parseFloat(e.target.value) || 15 })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Win Rate Drop (pp)</label>
              <input
                type="number"
                value={config.winRateDropThreshold}
                onChange={(e) => setConfig({ ...config, winRateDropThreshold: parseFloat(e.target.value) || 10 })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="rounded bg-zinc-700 border-zinc-600"
              />
              <span className="text-xs text-zinc-400">Alerts enabled</span>
            </label>
            <button
              onClick={handleSaveConfig}
              className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
