'use client'

import { useState, useEffect } from 'react'
import {
  getKellyConfig,
  setKellyPreset,
  setKellyConfig,
  KELLY_PRESETS,
  type KellyPreset,
  type KellyConfig,
} from '@/lib/kelly-override'

export function KellyOverridePanel() {
  const [config, setConfigState] = useState<KellyConfig>({ preset: 'quarter', multiplier: 0.25 })
  const [customValue, setCustomValue] = useState('0.5')

  useEffect(() => {
    const loaded = getKellyConfig()
    setConfigState(loaded)
    if (loaded.preset === 'custom') {
      setCustomValue(String(loaded.multiplier))
    }
  }, [])

  function handlePresetChange(preset: KellyPreset) {
    if (preset === 'custom') {
      const mult = parseFloat(customValue) || 0.5
      const newConfig = setKellyPreset('custom', mult)
      setConfigState(newConfig)
    } else {
      const newConfig = setKellyPreset(preset)
      setConfigState(newConfig)
    }
  }

  function handleCustomChange(value: string) {
    setCustomValue(value)
    const mult = parseFloat(value)
    if (mult > 0 && mult <= 2) {
      const newConfig: KellyConfig = { preset: 'custom', multiplier: mult }
      setKellyConfig(newConfig)
      setConfigState(newConfig)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Kelly Fraction</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Set your default Kelly criterion multiplier. Lower fractions reduce variance
          at the cost of slower bankroll growth.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(KELLY_PRESETS) as KellyPreset[])
          .filter((p) => p !== 'custom')
          .map((preset) => {
            const info = KELLY_PRESETS[preset]
            const isActive = config.preset === preset
            return (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border hover:bg-zinc-800'
                }`}
              >
                <div className="text-sm font-semibold">{info.label}</div>
                <div className="text-2xl font-bold mt-1">{info.multiplier}x</div>
                <div className="text-xs text-zinc-400 mt-1">{info.description}</div>
              </button>
            )
          })}
      </div>

      {/* Custom input */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handlePresetChange('custom')}
          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
            config.preset === 'custom'
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-border hover:bg-zinc-800'
          }`}
        >
          Custom
        </button>
        {config.preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customValue}
              onChange={(e) => handleCustomChange(e.target.value)}
              min="0.1"
              max="2.0"
              step="0.05"
              className="w-20 rounded-md border border-border bg-zinc-950 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-400">x Kelly</span>
          </div>
        )}
      </div>

      {/* Current setting summary */}
      <div className="rounded-lg border border-border bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Current Setting</div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {config.multiplier}x Kelly &mdash; {KELLY_PRESETS[config.preset]?.description || 'Custom multiplier'}
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-400">{config.multiplier}x</div>
        </div>

        {/* Visual explanation */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-400">If Full Kelly says bet 5% of bankroll:</span>
            <div className="font-medium text-zinc-200 mt-0.5">
              You bet {(5 * config.multiplier).toFixed(1)}% ({config.multiplier}x)
            </div>
          </div>
          <div>
            <span className="text-zinc-400">Variance reduction vs Full Kelly:</span>
            <div className="font-medium text-zinc-200 mt-0.5">
              {Math.round((1 - config.multiplier) * 100)}% less variance
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-500 italic">
        For informational purposes only. Not financial advice.
        Quarter Kelly is recommended for most bettors to manage variance.
      </p>
    </div>
  )
}
