/**
 * Pick Tagging System — Custom tags for picks with performance tracking.
 *
 * Lets the user assign tags (e.g., "value", "revenge game", "back-to-back",
 * "prime time") to picks and analyze performance per tag.
 *
 * Tags stored in localStorage (keyed by pick ID).
 * Pure functions — no side effects except localStorage read/write.
 */

export interface PickTag {
  /** Tag name, lowercase trimmed */
  name: string
  /** Color for display (auto-assigned from palette) */
  color: string
}

export interface PickTagAssignment {
  pickId: string
  tags: string[]
  updatedAt: string
}

export interface TagPerformance {
  tag: string
  wins: number
  losses: number
  pushes: number
  pending: number
  total: number
  winRate: number | null
  profit: number
  roi: number
  avgOdds: number | null
  /** Number of unique picks with this tag */
  pickCount: number
}

export interface TagSuggestion {
  tag: string
  /** Why it's suggested */
  reason: string
}

interface PickForTagAnalysis {
  id: string
  outcome: string | null
  profit: number | null
  units: number
  odds: number
  pick_team?: string | null
  sport?: string
  notes?: string | null
}

const STORAGE_KEY = 'betbrain_pick_tags'
const CUSTOM_TAGS_KEY = 'betbrain_custom_tags'

// Color palette for tags
const TAG_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
]

// Built-in tag suggestions
const BUILT_IN_TAGS = [
  'value',
  'revenge game',
  'back-to-back',
  'prime time',
  'divisional',
  'rest advantage',
  'fade public',
  'sharp play',
  'system pick',
  'gut feel',
  'live bet',
  'closing line value',
  'contrarian',
  'home underdog',
  'road favorite',
  'totals lean',
  'injury impact',
  'weather play',
  'trap game',
  'must win',
]

function loadAssignments(): PickTagAssignment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PickTagAssignment[]) : []
  } catch {
    return []
  }
}

function saveAssignments(assignments: PickTagAssignment[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
}

function loadCustomTags(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveCustomTags(tags: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags))
}

/**
 * Normalize a tag name: lowercase, trimmed, single spaces.
 */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Get a consistent color for a tag based on its name.
 */
export function getTagColor(tag: string): string {
  const normalized = normalizeTag(tag)
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

/**
 * Get all available tags (built-in + custom).
 */
export function getAllTags(): string[] {
  const custom = loadCustomTags()
  const all = new Set([...BUILT_IN_TAGS, ...custom])
  return [...all].sort()
}

/**
 * Add a custom tag to the tag library.
 */
export function addCustomTag(tag: string): string {
  const normalized = normalizeTag(tag)
  if (!normalized) return ''
  const custom = loadCustomTags()
  if (!custom.includes(normalized) && !BUILT_IN_TAGS.includes(normalized)) {
    custom.push(normalized)
    saveCustomTags(custom)
  }
  return normalized
}

/**
 * Remove a custom tag from the library (does not remove from picks).
 */
export function removeCustomTag(tag: string): void {
  const normalized = normalizeTag(tag)
  const custom = loadCustomTags().filter((t) => t !== normalized)
  saveCustomTags(custom)
}

/**
 * Get tags assigned to a specific pick.
 */
export function getPickTags(pickId: string): string[] {
  const assignments = loadAssignments()
  return assignments.find((a) => a.pickId === pickId)?.tags ?? []
}

/**
 * Set tags for a specific pick (replaces existing).
 */
export function setPickTags(pickId: string, tags: string[]): PickTagAssignment {
  const assignments = loadAssignments()
  const normalized = tags.map(normalizeTag).filter(Boolean)
  // Deduplicate
  const unique = [...new Set(normalized)]
  const now = new Date().toISOString()

  const idx = assignments.findIndex((a) => a.pickId === pickId)
  const assignment: PickTagAssignment = { pickId, tags: unique, updatedAt: now }

  if (idx >= 0) {
    assignments[idx] = assignment
  } else {
    assignments.push(assignment)
  }

  // Auto-add any new custom tags
  for (const tag of unique) {
    addCustomTag(tag)
  }

  saveAssignments(assignments)
  return assignment
}

/**
 * Add a single tag to a pick (does not remove existing).
 */
export function addTagToPick(pickId: string, tag: string): string[] {
  const existing = getPickTags(pickId)
  const normalized = normalizeTag(tag)
  if (!normalized || existing.includes(normalized)) return existing
  const updated = [...existing, normalized]
  setPickTags(pickId, updated)
  return updated
}

/**
 * Remove a single tag from a pick.
 */
export function removeTagFromPick(pickId: string, tag: string): string[] {
  const existing = getPickTags(pickId)
  const normalized = normalizeTag(tag)
  const updated = existing.filter((t) => t !== normalized)
  setPickTags(pickId, updated)
  return updated
}

/**
 * Get all pick assignments (for bulk analysis).
 */
export function getAllAssignments(): PickTagAssignment[] {
  return loadAssignments()
}

/**
 * Get all unique tags currently in use across all picks.
 */
export function getTagsInUse(): string[] {
  const assignments = loadAssignments()
  const tags = new Set<string>()
  for (const a of assignments) {
    for (const t of a.tags) tags.add(t)
  }
  return [...tags].sort()
}

/**
 * Calculate performance metrics for each tag.
 */
export function calcTagPerformance(
  picks: PickForTagAnalysis[],
  assignments?: PickTagAssignment[]
): TagPerformance[] {
  const allAssignments = assignments ?? loadAssignments()
  const tagMap = new Map<string, PickForTagAnalysis[]>()

  // Build tag -> picks mapping
  for (const assignment of allAssignments) {
    const pick = picks.find((p) => p.id === assignment.pickId)
    if (!pick) continue
    for (const tag of assignment.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag)!.push(pick)
    }
  }

  const results: TagPerformance[] = []

  for (const [tag, tagPicks] of tagMap) {
    let wins = 0
    let losses = 0
    let pushes = 0
    let pending = 0
    let totalProfit = 0
    let totalUnits = 0
    let totalOdds = 0

    for (const p of tagPicks) {
      if (p.outcome === 'win') wins++
      else if (p.outcome === 'loss') losses++
      else if (p.outcome === 'push') pushes++
      else pending++

      if (p.profit != null) totalProfit += p.profit
      totalUnits += p.units
      totalOdds += p.odds
    }

    const resolved = wins + losses + pushes
    results.push({
      tag,
      wins,
      losses,
      pushes,
      pending,
      total: tagPicks.length,
      winRate: resolved > 0 ? (wins / resolved) * 100 : null,
      profit: totalProfit,
      roi: totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0,
      avgOdds: tagPicks.length > 0 ? totalOdds / tagPicks.length : null,
      pickCount: tagPicks.length,
    })
  }

  return results.sort((a, b) => b.roi - a.roi)
}

/**
 * Get the best and worst performing tags.
 */
export function getTagExtremes(performances: TagPerformance[]): {
  best: TagPerformance | null
  worst: TagPerformance | null
} {
  const withResults = performances.filter((p) => p.wins + p.losses > 0)
  if (withResults.length === 0) return { best: null, worst: null }

  const sorted = [...withResults].sort((a, b) => b.roi - a.roi)
  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1],
  }
}

/**
 * Suggest tags for a pick based on its properties.
 */
export function suggestTags(pick: PickForTagAnalysis): TagSuggestion[] {
  const suggestions: TagSuggestion[] = []

  // Underdog detection
  if (pick.odds > 0 && pick.odds >= 150) {
    suggestions.push({ tag: 'value', reason: 'Underdog at +150 or higher' })
  }

  // Home underdog
  if (pick.odds > 0 && pick.odds >= 100) {
    suggestions.push({ tag: 'home underdog', reason: 'Positive odds pick' })
  }

  // Notes-based suggestions
  if (pick.notes) {
    const lower = pick.notes.toLowerCase()
    if (lower.includes('revenge') || lower.includes('payback')) {
      suggestions.push({ tag: 'revenge game', reason: 'Notes mention revenge' })
    }
    if (lower.includes('back to back') || lower.includes('b2b')) {
      suggestions.push({ tag: 'back-to-back', reason: 'Notes mention back-to-back' })
    }
    if (lower.includes('prime') || lower.includes('national') || lower.includes('espn')) {
      suggestions.push({ tag: 'prime time', reason: 'Notes mention prime time broadcast' })
    }
    if (lower.includes('fade') || lower.includes('contrarian') || lower.includes('against public')) {
      suggestions.push({ tag: 'fade public', reason: 'Notes mention fading public' })
    }
    if (lower.includes('sharp') || lower.includes('rlm') || lower.includes('reverse line')) {
      suggestions.push({ tag: 'sharp play', reason: 'Notes mention sharp action' })
    }
    if (lower.includes('gut') || lower.includes('feeling') || lower.includes('hunch')) {
      suggestions.push({ tag: 'gut feel', reason: 'Notes suggest gut feeling' })
    }
    if (lower.includes('live') || lower.includes('in-game') || lower.includes('in game')) {
      suggestions.push({ tag: 'live bet', reason: 'Notes mention live/in-game betting' })
    }
    if (lower.includes('injury') || lower.includes('injured') || lower.includes('out ')) {
      suggestions.push({ tag: 'injury impact', reason: 'Notes mention injuries' })
    }
    if (lower.includes('weather') || lower.includes('wind') || lower.includes('rain') || lower.includes('snow')) {
      suggestions.push({ tag: 'weather play', reason: 'Notes mention weather conditions' })
    }
    if (lower.includes('trap')) {
      suggestions.push({ tag: 'trap game', reason: 'Notes mention trap game' })
    }
    if (lower.includes('must win') || lower.includes('elimination') || lower.includes('playoff')) {
      suggestions.push({ tag: 'must win', reason: 'Notes mention must-win scenario' })
    }
  }

  // Remove duplicates
  const seen = new Set<string>()
  return suggestions.filter((s) => {
    if (seen.has(s.tag)) return false
    seen.add(s.tag)
    return true
  })
}

/**
 * Get tag co-occurrence — which tags appear together most often.
 */
export function getTagCoOccurrence(
  assignments?: PickTagAssignment[]
): { tagA: string; tagB: string; count: number }[] {
  const allAssignments = assignments ?? loadAssignments()
  const pairCounts = new Map<string, number>()

  for (const a of allAssignments) {
    if (a.tags.length < 2) continue
    const sorted = [...a.tags].sort()
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|${sorted[j]}`
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }
  }

  return [...pairCounts.entries()]
    .map(([key, count]) => {
      const [tagA, tagB] = key.split('|')
      return { tagA, tagB, count }
    })
    .sort((a, b) => b.count - a.count)
}
