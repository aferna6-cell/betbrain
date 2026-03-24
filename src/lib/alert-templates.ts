/**
 * Alert Templates — Save and reuse common alert configurations.
 *
 * Lets the user save frequently used alert setups (e.g., "NBA underdog ML
 * drops below +200") as templates for quick re-application.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface AlertTemplate {
  id: string
  name: string
  description: string
  sport: string
  market: 'moneyline' | 'spread' | 'total'
  condition: 'above' | 'below'
  threshold: number
  side: 'home' | 'away'
  /** Category for organization */
  category: 'value' | 'steam' | 'injury' | 'custom'
  /** How many times this template has been used */
  useCount: number
  createdAt: string
  lastUsedAt: string | null
}

export interface AlertFromTemplate {
  sport: string
  market: string
  condition: 'above' | 'below'
  threshold: number
  side: 'home' | 'away'
}

// Built-in starter templates
const STARTER_TEMPLATES: Omit<AlertTemplate, 'id' | 'useCount' | 'createdAt' | 'lastUsedAt'>[] = [
  {
    name: 'NBA Underdog Value',
    description: 'Alert when NBA underdog moneyline drops below +200',
    sport: 'nba',
    market: 'moneyline',
    condition: 'below',
    threshold: 200,
    side: 'away',
    category: 'value',
  },
  {
    name: 'NFL Key Number Spread',
    description: 'Alert when NFL spread crosses key number -3',
    sport: 'nfl',
    market: 'spread',
    condition: 'below',
    threshold: -3,
    side: 'home',
    category: 'value',
  },
  {
    name: 'NBA Total Drops',
    description: 'Alert when NBA total drops below 220',
    sport: 'nba',
    market: 'total',
    condition: 'below',
    threshold: 220,
    side: 'home',
    category: 'steam',
  },
  {
    name: 'NFL Heavy Favorite',
    description: 'Alert when NFL favorite hits -300 or below',
    sport: 'nfl',
    market: 'moneyline',
    condition: 'below',
    threshold: -300,
    side: 'home',
    category: 'steam',
  },
  {
    name: 'MLB Underdog Alert',
    description: 'Alert when MLB underdog rises above +180',
    sport: 'mlb',
    market: 'moneyline',
    condition: 'above',
    threshold: 180,
    side: 'away',
    category: 'value',
  },
]

/**
 * Get starter templates (built-in defaults).
 */
export function getStarterTemplates(): AlertTemplate[] {
  return STARTER_TEMPLATES.map((t, i) => ({
    ...t,
    id: `starter-${i}`,
    useCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    lastUsedAt: null,
  }))
}

/**
 * Create a new alert template.
 */
export function createTemplate(
  name: string,
  config: {
    description?: string
    sport: string
    market: 'moneyline' | 'spread' | 'total'
    condition: 'above' | 'below'
    threshold: number
    side: 'home' | 'away'
    category?: AlertTemplate['category']
  }
): AlertTemplate {
  return {
    id: generateId(),
    name: name.trim(),
    description: config.description?.trim() || '',
    sport: config.sport,
    market: config.market,
    condition: config.condition,
    threshold: config.threshold,
    side: config.side,
    category: config.category || 'custom',
    useCount: 0,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  }
}

/**
 * Apply a template to create an alert config.
 */
export function applyTemplate(template: AlertTemplate): AlertFromTemplate {
  return {
    sport: template.sport,
    market: template.market,
    condition: template.condition,
    threshold: template.threshold,
    side: template.side,
  }
}

/**
 * Record template usage (returns updated template).
 */
export function recordTemplateUse(template: AlertTemplate): AlertTemplate {
  return {
    ...template,
    useCount: template.useCount + 1,
    lastUsedAt: new Date().toISOString(),
  }
}

/**
 * Sort templates by frequency of use, then by recency.
 */
export function sortTemplatesByUsage(templates: AlertTemplate[]): AlertTemplate[] {
  return [...templates].sort((a, b) => {
    if (b.useCount !== a.useCount) return b.useCount - a.useCount
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
    return bTime - aTime
  })
}

/**
 * Filter templates by sport and/or category.
 */
export function filterTemplates(
  templates: AlertTemplate[],
  filters: { sport?: string; category?: string; search?: string }
): AlertTemplate[] {
  return templates.filter((t) => {
    if (filters.sport && t.sport !== filters.sport) return false
    if (filters.category && t.category !== filters.category) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })
}

function generateId(): string {
  return `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
