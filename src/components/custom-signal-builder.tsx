'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'
import {
  evaluateAllRules,
  getPresetRules,
  validateRule,
  type CustomSignalRule,
  type CustomSignalMatch,
  type SignalCondition,
  type ConditionType,
  type LogicOperator,
} from '@/lib/custom-signals'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'betbrain-custom-signal-rules'

const CONDITION_LABELS: Record<ConditionType, string> = {
  odds_variance: 'Odds Variance >=',
  best_odds_above: 'Best Odds Above',
  best_odds_below: 'Best Odds Below',
  book_count_gte: 'Book Count >=',
  spread_available: 'Spread Available',
  total_available: 'Total Available',
  home_favorite: 'Home Favorite',
  away_favorite: 'Away Favorite',
  spread_gte: 'Spread >=',
  spread_lte: 'Spread <=',
  total_gte: 'Total >=',
  total_lte: 'Total <=',
}

const NEEDS_VALUE: ConditionType[] = [
  'odds_variance', 'best_odds_above', 'best_odds_below',
  'book_count_gte', 'spread_gte', 'spread_lte', 'total_gte', 'total_lte',
]

const NEEDS_SIDE: ConditionType[] = ['best_odds_above', 'best_odds_below']

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadRules(): CustomSignalRule[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return []
}

function saveRules(rules: CustomSignalRule[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MatchCard({ match }: { match: CustomSignalMatch }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/games/${match.game.id}`}
          className="font-medium text-white hover:text-blue-400 text-sm"
        >
          {match.game.awayTeam} @ {match.game.homeTeam}
        </Link>
        <Badge
          variant="outline"
          className={match.matchRatio >= 1 ? 'border-green-600 text-green-400' : 'border-amber-600 text-amber-400'}
        >
          {Math.round(match.matchRatio * 100)}% match
        </Badge>
      </div>
      <div className="flex gap-2">
        <Badge variant="outline" className="text-xs">
          {SPORT_LABELS[match.game.sport as keyof typeof SPORT_LABELS] ?? match.game.sport}
        </Badge>
        <span className="text-xs text-gray-500">{formatGameTime(match.game.commenceTime)}</span>
      </div>
      <div className="space-y-1">
        {match.matchedConditions.map((desc, i) => (
          <div key={i} className="text-xs text-gray-400 flex items-center gap-1">
            <span className="text-green-500">&#10003;</span> {desc}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: SignalCondition
  index: number
  onChange: (index: number, c: SignalCondition) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-800/50 rounded p-2">
      <select
        value={condition.type}
        onChange={(e) => onChange(index, { ...condition, type: e.target.value as ConditionType })}
        className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 flex-1"
      >
        {Object.entries(CONDITION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {NEEDS_VALUE.includes(condition.type) && (
        <input
          type="number"
          value={condition.value}
          onChange={(e) => onChange(index, { ...condition, value: Number(e.target.value) })}
          className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 w-20"
          step="0.5"
        />
      )}

      {NEEDS_SIDE.includes(condition.type) && (
        <select
          value={condition.side ?? 'home'}
          onChange={(e) => onChange(index, { ...condition, side: e.target.value as 'home' | 'away' })}
          className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 w-20"
        >
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
      )}

      <button
        onClick={() => onRemove(index)}
        className="text-red-400 hover:text-red-300 text-xs px-1"
        title="Remove condition"
      >
        &#x2715;
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CustomSignalBuilder({ games }: { games: NormalizedGame[] }) {
  const [rules, setRules] = useState<CustomSignalRule[]>([])
  const [matches, setMatches] = useState<CustomSignalMatch[]>([])
  const [editing, setEditing] = useState(false)
  const [editRule, setEditRule] = useState<Partial<CustomSignalRule> | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  // Load rules from localStorage on mount
  useEffect(() => {
    const saved = loadRules()
    if (saved.length === 0) {
      // Initialize with presets on first use
      const presets = getPresetRules()
      setRules(presets)
      saveRules(presets)
    } else {
      setRules(saved)
    }
  }, [])

  // Evaluate rules when rules or games change
  useEffect(() => {
    const enabled = rules.filter((r) => r.enabled)
    if (enabled.length > 0 && games.length > 0) {
      setMatches(evaluateAllRules(enabled, games))
    } else {
      setMatches([])
    }
  }, [rules, games])

  const handleSave = useCallback(() => {
    if (!editRule) return
    const validationErrors = validateRule(editRule)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    const newRule: CustomSignalRule = {
      id: editRule.id || `custom-${Date.now()}`,
      name: editRule.name!.trim(),
      description: editRule.description || '',
      sport: editRule.sport || null,
      conditions: editRule.conditions || [],
      logic: editRule.logic || 'AND',
      enabled: editRule.enabled !== false,
      createdAt: editRule.createdAt || new Date().toISOString(),
    }

    const updated = editRule.id
      ? rules.map((r) => (r.id === editRule.id ? newRule : r))
      : [...rules, newRule]

    setRules(updated)
    saveRules(updated)
    setEditing(false)
    setEditRule(null)
    setErrors([])
  }, [editRule, rules])

  const handleDelete = useCallback((id: string) => {
    const updated = rules.filter((r) => r.id !== id)
    setRules(updated)
    saveRules(updated)
  }, [rules])

  const handleToggle = useCallback((id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    )
    setRules(updated)
    saveRules(updated)
  }, [rules])

  const handleAddCondition = useCallback(() => {
    if (!editRule) return
    setEditRule({
      ...editRule,
      conditions: [
        ...(editRule.conditions || []),
        { type: 'book_count_gte', value: 3 },
      ],
    })
  }, [editRule])

  const handleConditionChange = useCallback(
    (index: number, condition: SignalCondition) => {
      if (!editRule) return
      const conditions = [...(editRule.conditions || [])]
      conditions[index] = condition
      setEditRule({ ...editRule, conditions })
    },
    [editRule]
  )

  const handleConditionRemove = useCallback(
    (index: number) => {
      if (!editRule) return
      const conditions = [...(editRule.conditions || [])]
      conditions.splice(index, 1)
      setEditRule({ ...editRule, conditions })
    },
    [editRule]
  )

  const startNew = useCallback(() => {
    setEditRule({
      name: '',
      description: '',
      sport: null,
      conditions: [{ type: 'book_count_gte', value: 3 }],
      logic: 'AND',
      enabled: true,
    })
    setEditing(true)
    setErrors([])
  }, [])

  const startEdit = useCallback((rule: CustomSignalRule) => {
    setEditRule({ ...rule })
    setEditing(true)
    setErrors([])
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Custom Signal Builder</h2>
          <p className="text-sm text-gray-400">
            Create rules to find games matching your criteria.
            For informational purposes only. Not financial advice.
          </p>
        </div>
        {!editing && (
          <button
            onClick={startNew}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded"
          >
            + New Rule
          </button>
        )}
      </div>

      {/* Rule editor */}
      {editing && editRule && (
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/80 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Rule Name</label>
              <input
                type="text"
                value={editRule.name || ''}
                onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 w-full mt-1"
                placeholder="e.g., Large Spread NBA"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Sport Filter</label>
              <select
                value={editRule.sport || ''}
                onChange={(e) => setEditRule({ ...editRule, sport: e.target.value || null })}
                className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 w-full mt-1"
              >
                <option value="">All Sports</option>
                <option value="nba">NBA</option>
                <option value="nfl">NFL</option>
                <option value="mlb">MLB</option>
                <option value="nhl">NHL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Description</label>
            <input
              type="text"
              value={editRule.description || ''}
              onChange={(e) => setEditRule({ ...editRule, description: e.target.value })}
              className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 w-full mt-1"
              placeholder="What this rule looks for..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-xs text-gray-400">Logic:</label>
            <div className="flex gap-2">
              {(['AND', 'OR'] as LogicOperator[]).map((op) => (
                <button
                  key={op}
                  onClick={() => setEditRule({ ...editRule, logic: op })}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    editRule.logic === op
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {editRule.logic === 'AND' ? 'All conditions must match' : 'Any condition can match'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium">Conditions</label>
              <button
                onClick={handleAddCondition}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Add Condition
              </button>
            </div>
            {(editRule.conditions || []).map((c, i) => (
              <ConditionRow
                key={i}
                condition={c}
                index={i}
                onChange={handleConditionChange}
                onRemove={handleConditionRemove}
              />
            ))}
          </div>

          {errors.length > 0 && (
            <div className="text-xs text-red-400 space-y-1">
              {errors.map((e, i) => (
                <div key={i}>- {e}</div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded"
            >
              Save Rule
            </button>
            <button
              onClick={() => { setEditing(false); setEditRule(null); setErrors([]) }}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved rules */}
      {!editing && rules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Your Rules ({rules.length})</h3>
          <div className="grid gap-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded border border-gray-800 bg-gray-900/60 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${rule.enabled ? 'text-white' : 'text-gray-500'}`}>
                      {rule.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {rule.logic}
                    </Badge>
                    {rule.sport && (
                      <Badge variant="outline" className="text-xs">
                        {SPORT_LABELS[rule.sport as keyof typeof SPORT_LABELS] ?? rule.sport}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule.id)}
                    className={`text-xs px-2 py-1 rounded ${
                      rule.enabled
                        ? 'bg-green-900/40 text-green-400'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {rule.enabled ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={() => startEdit(rule)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches */}
      {!editing && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">
            Matching Games ({matches.length})
          </h3>
          {matches.length === 0 ? (
            <p className="text-sm text-gray-500">
              {rules.filter((r) => r.enabled).length === 0
                ? 'Enable at least one rule to see matches.'
                : games.length === 0
                ? 'No games data available.'
                : 'No games match your active rules.'}
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {matches.map((m, i) => (
                <MatchCard key={`${m.rule.id}-${m.game.id}-${i}`} match={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
