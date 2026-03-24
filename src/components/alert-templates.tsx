'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getStarterTemplates,
  createTemplate,
  applyTemplate,
  recordTemplateUse,
  sortTemplatesByUsage,
  filterTemplates,
  type AlertTemplate,
  type AlertFromTemplate,
} from '@/lib/alert-templates'

const STORAGE_KEY = 'betbrain-alert-templates'

interface AlertTemplatesProps {
  onApply?: (config: AlertFromTemplate) => void
}

export function AlertTemplatesPanel({ onApply }: AlertTemplatesProps) {
  const [templates, setTemplates] = useState<AlertTemplate[]>([])
  const [sportFilter, setSportFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setTemplates(JSON.parse(raw))
      } else {
        const starters = getStarterTemplates()
        setTemplates(starters)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(starters))
      }
    } catch {
      setTemplates(getStarterTemplates())
    }
  }, [])

  const saveTemplates = useCallback((updated: AlertTemplate[]) => {
    setTemplates(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch { /* empty */ }
  }, [])

  const handleApply = useCallback((template: AlertTemplate) => {
    const config = applyTemplate(template)
    const updated = recordTemplateUse(template)
    const newTemplates = templates.map((t) => t.id === template.id ? updated : t)
    saveTemplates(newTemplates)
    onApply?.(config)
  }, [templates, saveTemplates, onApply])

  const handleCreate = useCallback((name: string, config: {
    sport: string
    market: 'moneyline' | 'spread' | 'total'
    condition: 'above' | 'below'
    threshold: number
    side: 'home' | 'away'
  }) => {
    const template = createTemplate(name, config)
    saveTemplates([...templates, template])
    setShowCreate(false)
  }, [templates, saveTemplates])

  const handleDelete = useCallback((id: string) => {
    saveTemplates(templates.filter((t) => t.id !== id))
  }, [templates, saveTemplates])

  const filtered = filterTemplates(
    sortTemplatesByUsage(templates),
    { sport: sportFilter || undefined }
  )

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Alert Templates</h3>
          <p className="text-sm text-muted-foreground">
            Save common alert configurations for quick setup.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm text-primary hover:underline"
        >
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2">
        {['', 'nba', 'nfl', 'mlb', 'nhl'].map((sport) => (
          <button
            key={sport}
            onClick={() => setSportFilter(sport)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              sportFilter === sport
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {sport ? sport.toUpperCase() : 'All'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateTemplateForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      {/* Template list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No templates {sportFilter ? `for ${sportFilter.toUpperCase()}` : ''}
          </p>
        ) : (
          filtered.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 rounded-md border border-border/50 p-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {template.sport.toUpperCase()} | {template.market} | {template.condition} {template.threshold}
                  {template.useCount > 0 && ` | Used ${template.useCount}x`}
                </div>
              </div>
              <button
                onClick={() => handleApply(template)}
                className="text-xs text-primary hover:underline px-2 py-1 shrink-0"
              >
                Apply
              </button>
              {!template.id.startsWith('starter-') && (
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-xs text-red-400 hover:underline px-2 py-1 shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CreateTemplateForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, config: { sport: string; market: 'moneyline' | 'spread' | 'total'; condition: 'above' | 'below'; threshold: number; side: 'home' | 'away' }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('nba')
  const [market, setMarket] = useState<'moneyline' | 'spread' | 'total'>('moneyline')
  const [condition, setCondition] = useState<'above' | 'below'>('below')
  const [threshold, setThreshold] = useState('')
  const [side, setSide] = useState<'home' | 'away'>('home')

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <input
        type="text"
        placeholder="Template name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-border bg-background p-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={sport} onChange={(e) => setSport(e.target.value)} className="rounded-md border border-border bg-background p-2 text-sm">
          <option value="nba">NBA</option>
          <option value="nfl">NFL</option>
          <option value="mlb">MLB</option>
          <option value="nhl">NHL</option>
        </select>
        <select value={market} onChange={(e) => setMarket(e.target.value as 'moneyline' | 'spread' | 'total')} className="rounded-md border border-border bg-background p-2 text-sm">
          <option value="moneyline">Moneyline</option>
          <option value="spread">Spread</option>
          <option value="total">Total</option>
        </select>
        <select value={condition} onChange={(e) => setCondition(e.target.value as 'above' | 'below')} className="rounded-md border border-border bg-background p-2 text-sm">
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input
          type="number"
          placeholder="Threshold"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="rounded-md border border-border bg-background p-2 text-sm"
        />
        <select value={side} onChange={(e) => setSide(e.target.value as 'home' | 'away')} className="rounded-md border border-border bg-background p-2 text-sm">
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (name.trim() && threshold) {
              onSubmit(name, { sport, market, condition, threshold: Number(threshold), side })
            }
          }}
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          disabled={!name.trim() || !threshold}
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
