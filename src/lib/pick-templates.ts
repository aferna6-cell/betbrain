/**
 * Pick templates — save frequently used pick configurations for quick logging.
 * Stored in localStorage for instant access.
 */

export interface PickTemplate {
  id: string
  name: string
  sport: string
  pickType: string
  units: number
  /** Optional default line value (e.g., -3.5 for spread) */
  defaultLine: number | null
  /** How many times this template has been used */
  useCount: number
  createdAt: string
  lastUsedAt: string | null
}

const STORAGE_KEY = 'betbrain_pick_templates'

/**
 * Load all pick templates sorted by most recently used.
 */
export function loadPickTemplates(): PickTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const templates: PickTemplate[] = raw ? JSON.parse(raw) : []
    return templates.sort((a, b) => {
      // Most used first, then most recently used
      if (b.useCount !== a.useCount) return b.useCount - a.useCount
      const aLast = a.lastUsedAt ?? a.createdAt
      const bLast = b.lastUsedAt ?? b.createdAt
      return bLast.localeCompare(aLast)
    })
  } catch {
    return []
  }
}

/**
 * Save a new pick template.
 */
export function savePickTemplate(
  template: Omit<PickTemplate, 'id' | 'useCount' | 'createdAt' | 'lastUsedAt'>
): PickTemplate {
  const templates = loadPickTemplates()

  // Check for duplicates (same sport + pickType + units)
  const existing = templates.find(
    (t) => t.sport === template.sport && t.pickType === template.pickType && t.units === template.units
  )
  if (existing) {
    // Update name if different, return existing
    existing.name = template.name
    existing.defaultLine = template.defaultLine
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    return existing
  }

  const newTemplate: PickTemplate = {
    ...template,
    id: crypto.randomUUID(),
    useCount: 0,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  }

  templates.push(newTemplate)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return newTemplate
}

/**
 * Record usage of a template (increments count, updates lastUsedAt).
 */
export function usePickTemplate(id: string): PickTemplate | null {
  const templates = loadPickTemplates()
  const template = templates.find((t) => t.id === id)
  if (!template) return null

  template.useCount++
  template.lastUsedAt = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return template
}

/**
 * Delete a pick template by id.
 */
export function deletePickTemplate(id: string): boolean {
  const templates = loadPickTemplates()
  const idx = templates.findIndex((t) => t.id === id)
  if (idx < 0) return false

  templates.splice(idx, 1)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return true
}

/**
 * Get suggested templates based on recent pick patterns.
 * Pure function for testability.
 */
export function suggestTemplates(
  picks: { sport: string; pick_type: string; units: number }[]
): { sport: string; pickType: string; units: number; count: number }[] {
  const key = (p: { sport: string; pick_type: string; units: number }) =>
    `${p.sport}|${p.pick_type}|${p.units}`

  const counts = new Map<string, { sport: string; pickType: string; units: number; count: number }>()

  for (const pick of picks) {
    const k = key(pick)
    const existing = counts.get(k)
    if (existing) {
      existing.count++
    } else {
      counts.set(k, { sport: pick.sport, pickType: pick.pick_type, units: pick.units, count: 1 })
    }
  }

  return Array.from(counts.values())
    .filter((s) => s.count >= 3) // Only suggest patterns used 3+ times
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
