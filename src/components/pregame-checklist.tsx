'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DEFAULT_CHECKLIST_ITEMS,
  getChecklistItems,
  validateChecklist,
  loadChecklistConfig,
  saveChecklistConfig,
  recordChecklistCompletion,
  getAverageProcessScore,
  createCustomItem,
  type ChecklistConfig,
  type ChecklistState,
  type ChecklistValidation,
  type ChecklistItem,
} from '@/lib/pregame-checklist'

// ---------------------------------------------------------------------------
// Category colors
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  research: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500' },
  process: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  discipline: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
}

// ---------------------------------------------------------------------------
// Score color
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

// ---------------------------------------------------------------------------
// PregameChecklist component
// ---------------------------------------------------------------------------

export function PregameChecklist({
  onValidationChange,
  compact = false,
}: {
  onValidationChange?: (validation: ChecklistValidation) => void
  compact?: boolean
}) {
  const [config, setConfig] = useState<ChecklistConfig>({
    enforceRequired: true,
    customItems: [],
  })
  const [state, setState] = useState<ChecklistState>({})
  const [validation, setValidation] = useState<ChecklistValidation | null>(null)
  const [avgScore, setAvgScore] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<'research' | 'process' | 'discipline'>('research')

  // Load config on mount
  useEffect(() => {
    const cfg = loadChecklistConfig()
    setConfig(cfg)
    setAvgScore(getAverageProcessScore())
  }, [])

  // Revalidate when state or config changes
  useEffect(() => {
    const v = validateChecklist(state, config)
    setValidation(v)
    onValidationChange?.(v)
  }, [state, config, onValidationChange])

  const toggle = useCallback((itemId: string) => {
    setState((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }, [])

  const items = getChecklistItems(config)
  const requiredItems = items.filter((i) => i.required)
  const optionalItems = items.filter((i) => !i.required)

  const handleAddCustom = () => {
    if (!newItemLabel.trim()) return
    const item = createCustomItem(newItemLabel.trim(), '', newItemCategory)
    const updated = { ...config, customItems: [...config.customItems, item] }
    setConfig(updated)
    saveChecklistConfig(updated)
    setNewItemLabel('')
  }

  const handleRemoveCustom = (id: string) => {
    const updated = {
      ...config,
      customItems: config.customItems.filter((i) => i.id !== id),
    }
    setConfig(updated)
    saveChecklistConfig(updated)
    setState((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const toggleEnforce = () => {
    const updated = { ...config, enforceRequired: !config.enforceRequired }
    setConfig(updated)
    saveChecklistConfig(updated)
  }

  /**
   * Call this from parent when pick is submitted — records process score
   */
  const recordCompletion = useCallback(() => {
    if (validation) {
      recordChecklistCompletion(state, validation.processScore)
    }
  }, [state, validation])

  // Expose recordCompletion on window for parent integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__checklistRecordCompletion = recordCompletion
    }
  }, [recordCompletion])

  const renderItem = (item: ChecklistItem) => {
    const checked = !!state[item.id]
    const colors = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.research
    const isCustom = item.id.startsWith('custom-')

    return (
      <label
        key={item.id}
        className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
          checked
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-border bg-card hover:bg-muted/50'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle(item.id)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-green-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${checked ? 'text-green-400 line-through' : 'text-foreground'}`}>
              {item.label}
            </span>
            {item.required && (
              <span className="text-[10px] font-semibold text-red-400 uppercase">req</span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${colors.bg} ${colors.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {item.category}
            </span>
          </div>
          {item.description && !compact && (
            <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
        {isCustom && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              handleRemoveCustom(item.id)
            }}
            className="text-xs text-muted-foreground hover:text-red-400"
            title="Remove custom item"
          >
            x
          </button>
        )}
      </label>
    )
  }

  if (!validation) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Pre-Game Checklist</h3>
          <div className={`text-xs font-mono ${scoreColor(validation.processScore)}`}>
            {validation.processScore}%
          </div>
          {avgScore > 0 && (
            <span className="text-[10px] text-muted-foreground">
              avg: {avgScore}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {validation.checkedCount}/{validation.totalCount}
          </span>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showSettings ? 'Close' : 'Settings'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${scoreBg(validation.processScore)}`}
          style={{ width: `${validation.completionPct}%` }}
        />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.enforceRequired}
              onChange={toggleEnforce}
              className="h-4 w-4 rounded border-border accent-blue-500"
            />
            <span>Enforce required items (block pick if unchecked)</span>
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              placeholder="Add custom check..."
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as 'research' | 'process' | 'discipline')}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="research">Research</option>
              <option value="process">Process</option>
              <option value="discipline">Discipline</option>
            </select>
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!newItemLabel.trim()}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Required items */}
      {!compact && (
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Required
        </div>
      )}
      <div className={compact ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'}>
        {requiredItems.map(renderItem)}
      </div>

      {/* Optional items */}
      {optionalItems.length > 0 && (
        <>
          {!compact && (
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
              Recommended
            </div>
          )}
          <div className={compact ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'}>
            {optionalItems.map(renderItem)}
          </div>
        </>
      )}

      {/* Validation warning */}
      {!validation.valid && config.enforceRequired && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          Complete all required items before logging your pick. Missing:{' '}
          {validation.missingRequired
            .map((id) => items.find((i) => i.id === id)?.label ?? id)
            .join(', ')}
        </div>
      )}
    </div>
  )
}
