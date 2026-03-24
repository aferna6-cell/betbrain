/**
 * Pre-game checklist enforcer
 *
 * Requires completing key process steps before logging a pick.
 * Checklist items: thesis, line shopped, bankroll check, research.
 * Enforces good betting process — the #1 predictor of long-term success.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string
  label: string
  description: string
  required: boolean
  category: 'research' | 'process' | 'discipline'
}

export interface ChecklistState {
  [itemId: string]: boolean
}

export interface ChecklistConfig {
  /** If true, all required items must be checked before pick can be submitted */
  enforceRequired: boolean
  /** Custom items added by user */
  customItems: ChecklistItem[]
}

export interface ChecklistValidation {
  valid: boolean
  /** IDs of required items that are not checked */
  missingRequired: string[]
  /** Total items checked out of total */
  checkedCount: number
  totalCount: number
  /** Percentage completion */
  completionPct: number
  /** Process quality score (0-100) based on which items are checked */
  processScore: number
}

// ---------------------------------------------------------------------------
// Default Checklist Items
// ---------------------------------------------------------------------------

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'thesis',
    label: 'Betting thesis',
    description: 'I have a clear reason for this bet beyond gut feeling',
    required: true,
    category: 'research',
  },
  {
    id: 'line-shop',
    label: 'Line shopped',
    description: 'I compared odds across at least 2 books',
    required: true,
    category: 'process',
  },
  {
    id: 'bankroll-check',
    label: 'Bankroll check',
    description: 'This bet is within my unit sizing rules',
    required: true,
    category: 'discipline',
  },
  {
    id: 'not-chasing',
    label: 'Not chasing losses',
    description: 'This pick is independent of recent results',
    required: true,
    category: 'discipline',
  },
  {
    id: 'injury-check',
    label: 'Injury report checked',
    description: 'I reviewed the latest injury/lineup news',
    required: false,
    category: 'research',
  },
  {
    id: 'matchup-research',
    label: 'Matchup research',
    description: 'I reviewed relevant stats, trends, or H2H data',
    required: false,
    category: 'research',
  },
  {
    id: 'line-movement',
    label: 'Line movement reviewed',
    description: 'I checked if the line moved and understand why',
    required: false,
    category: 'process',
  },
  {
    id: 'value-confirmed',
    label: 'Value confirmed',
    description: 'My estimated probability differs from implied odds',
    required: false,
    category: 'process',
  },
]

// ---------------------------------------------------------------------------
// Process score weights by category
// ---------------------------------------------------------------------------

const CATEGORY_WEIGHTS: Record<string, number> = {
  research: 35,
  process: 40,
  discipline: 25,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const CONFIG_KEY = 'betbrain_checklist_config'
const HISTORY_KEY = 'betbrain_checklist_history'

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Get all checklist items (default + custom)
 */
export function getChecklistItems(config: ChecklistConfig): ChecklistItem[] {
  return [...DEFAULT_CHECKLIST_ITEMS, ...config.customItems]
}

/**
 * Validate checklist state against required items
 */
export function validateChecklist(
  state: ChecklistState,
  config: ChecklistConfig
): ChecklistValidation {
  const items = getChecklistItems(config)
  const missingRequired: string[] = []
  let checkedCount = 0

  for (const item of items) {
    if (state[item.id]) {
      checkedCount++
    } else if (item.required && config.enforceRequired) {
      missingRequired.push(item.id)
    }
  }

  const totalCount = items.length
  const completionPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
  const processScore = calculateProcessScore(state, items)

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    checkedCount,
    totalCount,
    completionPct,
    processScore,
  }
}

/**
 * Calculate process quality score (0-100)
 * Weighted by category importance
 */
export function calculateProcessScore(
  state: ChecklistState,
  items: ChecklistItem[]
): number {
  // Group items by category
  const byCategory: Record<string, { total: number; checked: number }> = {}

  for (const item of items) {
    if (!byCategory[item.category]) {
      byCategory[item.category] = { total: 0, checked: 0 }
    }
    byCategory[item.category].total++
    if (state[item.id]) {
      byCategory[item.category].checked++
    }
  }

  let totalWeight = 0
  let weightedScore = 0

  for (const [category, counts] of Object.entries(byCategory)) {
    const weight = CATEGORY_WEIGHTS[category] ?? 10
    totalWeight += weight
    if (counts.total > 0) {
      weightedScore += weight * (counts.checked / counts.total)
    }
  }

  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0
}

/**
 * Load checklist config from localStorage
 */
export function loadChecklistConfig(): ChecklistConfig {
  if (typeof window === 'undefined') {
    return { enforceRequired: true, customItems: [] }
  }
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        enforceRequired: parsed.enforceRequired ?? true,
        customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
      }
    }
  } catch {
    // Ignore
  }
  return { enforceRequired: true, customItems: [] }
}

/**
 * Save checklist config to localStorage
 */
export function saveChecklistConfig(config: ChecklistConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch {
    // Ignore
  }
}

/**
 * Record a completed checklist to history (for tracking process over time)
 */
export function recordChecklistCompletion(
  state: ChecklistState,
  processScore: number
): void {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    const history: Array<{ date: string; state: ChecklistState; score: number }> =
      stored ? JSON.parse(stored) : []
    history.push({
      date: new Date().toISOString(),
      state,
      score: processScore,
    })
    // Keep last 200 entries
    if (history.length > 200) {
      history.splice(0, history.length - 200)
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // Ignore
  }
}

/**
 * Get average process score from checklist history
 */
export function getAverageProcessScore(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return 0
    const history: Array<{ score: number }> = JSON.parse(stored)
    if (history.length === 0) return 0
    const sum = history.reduce((acc, h) => acc + h.score, 0)
    return Math.round(sum / history.length)
  } catch {
    return 0
  }
}

/**
 * Get recent checklist history entries
 */
export function getChecklistHistory(
  limit: number = 20
): Array<{ date: string; state: ChecklistState; score: number }> {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return []
    const history: Array<{ date: string; state: ChecklistState; score: number }> =
      JSON.parse(stored)
    return history.slice(-limit)
  } catch {
    return []
  }
}

/**
 * Create a new custom checklist item
 */
export function createCustomItem(
  label: string,
  description: string,
  category: 'research' | 'process' | 'discipline',
  required: boolean = false
): ChecklistItem {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    description,
    required,
    category,
  }
}
