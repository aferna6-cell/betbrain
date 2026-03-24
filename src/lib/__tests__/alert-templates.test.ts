import { describe, it, expect } from 'vitest'
import {
  getStarterTemplates,
  createTemplate,
  applyTemplate,
  recordTemplateUse,
  sortTemplatesByUsage,
  filterTemplates,
} from '../alert-templates'

describe('getStarterTemplates', () => {
  it('returns built-in templates', () => {
    const templates = getStarterTemplates()
    expect(templates.length).toBe(5)
    expect(templates[0].name).toBe('NBA Underdog Value')
    expect(templates[0].useCount).toBe(0)
  })

  it('templates have valid structure', () => {
    const templates = getStarterTemplates()
    for (const t of templates) {
      expect(t.id).toBeTruthy()
      expect(t.sport).toBeTruthy()
      expect(['moneyline', 'spread', 'total']).toContain(t.market)
      expect(['above', 'below']).toContain(t.condition)
      expect(typeof t.threshold).toBe('number')
    }
  })
})

describe('createTemplate', () => {
  it('creates a template with given config', () => {
    const t = createTemplate('My Alert', {
      sport: 'nba',
      market: 'moneyline',
      condition: 'below',
      threshold: 200,
      side: 'away',
    })
    expect(t.name).toBe('My Alert')
    expect(t.sport).toBe('nba')
    expect(t.category).toBe('custom')
    expect(t.useCount).toBe(0)
  })

  it('trims name and description', () => {
    const t = createTemplate('  My Alert  ', {
      description: '  Some desc  ',
      sport: 'nba',
      market: 'moneyline',
      condition: 'below',
      threshold: 200,
      side: 'away',
    })
    expect(t.name).toBe('My Alert')
    expect(t.description).toBe('Some desc')
  })

  it('uses provided category', () => {
    const t = createTemplate('Steam', {
      sport: 'nfl',
      market: 'spread',
      condition: 'below',
      threshold: -3,
      side: 'home',
      category: 'steam',
    })
    expect(t.category).toBe('steam')
  })

  it('generates unique IDs', () => {
    const t1 = createTemplate('A', { sport: 'nba', market: 'moneyline', condition: 'below', threshold: 200, side: 'away' })
    const t2 = createTemplate('B', { sport: 'nba', market: 'moneyline', condition: 'below', threshold: 200, side: 'away' })
    expect(t1.id).not.toBe(t2.id)
  })
})

describe('applyTemplate', () => {
  it('extracts alert config from template', () => {
    const templates = getStarterTemplates()
    const config = applyTemplate(templates[0])
    expect(config.sport).toBe('nba')
    expect(config.market).toBe('moneyline')
    expect(config.condition).toBe('below')
    expect(config.threshold).toBe(200)
  })
})

describe('recordTemplateUse', () => {
  it('increments use count', () => {
    const templates = getStarterTemplates()
    const updated = recordTemplateUse(templates[0])
    expect(updated.useCount).toBe(1)
    expect(updated.lastUsedAt).toBeTruthy()
  })

  it('does not mutate original', () => {
    const templates = getStarterTemplates()
    const original = templates[0]
    recordTemplateUse(original)
    expect(original.useCount).toBe(0)
  })
})

describe('sortTemplatesByUsage', () => {
  it('sorts by use count descending', () => {
    const templates = getStarterTemplates()
    templates[2].useCount = 5
    templates[0].useCount = 3
    const sorted = sortTemplatesByUsage(templates)
    expect(sorted[0].useCount).toBe(5)
    expect(sorted[1].useCount).toBe(3)
  })

  it('breaks ties by last used recency', () => {
    const t1 = createTemplate('A', { sport: 'nba', market: 'moneyline', condition: 'below', threshold: 200, side: 'away' })
    const t2 = createTemplate('B', { sport: 'nba', market: 'moneyline', condition: 'below', threshold: 200, side: 'away' })
    t1.useCount = 1
    t2.useCount = 1
    t1.lastUsedAt = '2026-03-20T10:00:00Z'
    t2.lastUsedAt = '2026-03-21T10:00:00Z' // More recent
    const sorted = sortTemplatesByUsage([t1, t2])
    expect(sorted[0].name).toBe('B')
  })
})

describe('filterTemplates', () => {
  it('filters by sport', () => {
    const templates = getStarterTemplates()
    const nba = filterTemplates(templates, { sport: 'nba' })
    expect(nba.every((t) => t.sport === 'nba')).toBe(true)
  })

  it('filters by category', () => {
    const templates = getStarterTemplates()
    const value = filterTemplates(templates, { category: 'value' })
    expect(value.every((t) => t.category === 'value')).toBe(true)
  })

  it('filters by search term', () => {
    const templates = getStarterTemplates()
    const result = filterTemplates(templates, { search: 'underdog' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((t) =>
      t.name.toLowerCase().includes('underdog') || t.description.toLowerCase().includes('underdog')
    )).toBe(true)
  })

  it('combines filters', () => {
    const templates = getStarterTemplates()
    const result = filterTemplates(templates, { sport: 'nba', category: 'value' })
    expect(result.every((t) => t.sport === 'nba' && t.category === 'value')).toBe(true)
  })

  it('returns all when no filters', () => {
    const templates = getStarterTemplates()
    const result = filterTemplates(templates, {})
    expect(result.length).toBe(templates.length)
  })
})
