import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_CHECKLIST_ITEMS,
  getChecklistItems,
  validateChecklist,
  calculateProcessScore,
  loadChecklistConfig,
  saveChecklistConfig,
  recordChecklistCompletion,
  getAverageProcessScore,
  getChecklistHistory,
  createCustomItem,
  type ChecklistConfig,
  type ChecklistState,
} from '../pregame-checklist'

// Mock localStorage
const store: Record<string, string> = {}
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
  vi.stubGlobal('window', {})
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
  })
})

const defaultConfig: ChecklistConfig = { enforceRequired: true, customItems: [] }

describe('DEFAULT_CHECKLIST_ITEMS', () => {
  it('has 8 default items', () => {
    expect(DEFAULT_CHECKLIST_ITEMS).toHaveLength(8)
  })

  it('has 4 required items', () => {
    const required = DEFAULT_CHECKLIST_ITEMS.filter((i) => i.required)
    expect(required).toHaveLength(4)
  })

  it('covers all three categories', () => {
    const cats = new Set(DEFAULT_CHECKLIST_ITEMS.map((i) => i.category))
    expect(cats).toEqual(new Set(['research', 'process', 'discipline']))
  })

  it('each item has unique id', () => {
    const ids = DEFAULT_CHECKLIST_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getChecklistItems', () => {
  it('returns default items when no custom items', () => {
    const items = getChecklistItems(defaultConfig)
    expect(items).toHaveLength(DEFAULT_CHECKLIST_ITEMS.length)
  })

  it('appends custom items', () => {
    const custom = createCustomItem('My check', 'desc', 'research')
    const config: ChecklistConfig = { enforceRequired: true, customItems: [custom] }
    const items = getChecklistItems(config)
    expect(items).toHaveLength(DEFAULT_CHECKLIST_ITEMS.length + 1)
    expect(items[items.length - 1].label).toBe('My check')
  })
})

describe('validateChecklist', () => {
  it('valid when all required items checked', () => {
    const state: ChecklistState = {
      thesis: true,
      'line-shop': true,
      'bankroll-check': true,
      'not-chasing': true,
    }
    const result = validateChecklist(state, defaultConfig)
    expect(result.valid).toBe(true)
    expect(result.missingRequired).toEqual([])
    expect(result.checkedCount).toBe(4)
  })

  it('invalid when missing required items', () => {
    const state: ChecklistState = { thesis: true }
    const result = validateChecklist(state, defaultConfig)
    expect(result.valid).toBe(false)
    expect(result.missingRequired).toContain('line-shop')
    expect(result.missingRequired).toContain('bankroll-check')
    expect(result.missingRequired).toContain('not-chasing')
  })

  it('valid with enforcement off even with missing required', () => {
    const config: ChecklistConfig = { enforceRequired: false, customItems: [] }
    const result = validateChecklist({}, config)
    expect(result.valid).toBe(true)
  })

  it('reports correct completion percentage', () => {
    const state: ChecklistState = {
      thesis: true,
      'line-shop': true,
      'bankroll-check': true,
      'not-chasing': true,
      'injury-check': true,
      'matchup-research': true,
      'line-movement': true,
      'value-confirmed': true,
    }
    const result = validateChecklist(state, defaultConfig)
    expect(result.completionPct).toBe(100)
    expect(result.checkedCount).toBe(8)
    expect(result.totalCount).toBe(8)
  })

  it('reports 0% for empty state', () => {
    const result = validateChecklist({}, defaultConfig)
    expect(result.completionPct).toBe(0)
  })

  it('includes processScore', () => {
    const state: ChecklistState = { thesis: true, 'line-shop': true }
    const result = validateChecklist(state, defaultConfig)
    expect(result.processScore).toBeGreaterThan(0)
    expect(result.processScore).toBeLessThanOrEqual(100)
  })
})

describe('calculateProcessScore', () => {
  it('returns 100 for all items checked', () => {
    const items = DEFAULT_CHECKLIST_ITEMS
    const state: ChecklistState = {}
    items.forEach((i) => { state[i.id] = true })
    expect(calculateProcessScore(state, items)).toBe(100)
  })

  it('returns 0 for no items checked', () => {
    expect(calculateProcessScore({}, DEFAULT_CHECKLIST_ITEMS)).toBe(0)
  })

  it('weights research higher than discipline', () => {
    // Check all research items only
    const researchState: ChecklistState = {}
    DEFAULT_CHECKLIST_ITEMS.filter((i) => i.category === 'research').forEach((i) => {
      researchState[i.id] = true
    })
    const researchScore = calculateProcessScore(researchState, DEFAULT_CHECKLIST_ITEMS)

    // Check all discipline items only
    const discState: ChecklistState = {}
    DEFAULT_CHECKLIST_ITEMS.filter((i) => i.category === 'discipline').forEach((i) => {
      discState[i.id] = true
    })
    const discScore = calculateProcessScore(discState, DEFAULT_CHECKLIST_ITEMS)

    expect(researchScore).toBeGreaterThan(discScore)
  })

  it('handles empty items array', () => {
    expect(calculateProcessScore({}, [])).toBe(0)
  })
})

describe('loadChecklistConfig / saveChecklistConfig', () => {
  it('returns default config when nothing stored', () => {
    const config = loadChecklistConfig()
    expect(config.enforceRequired).toBe(true)
    expect(config.customItems).toEqual([])
  })

  it('round-trips config through storage', () => {
    const custom = createCustomItem('Test', 'desc', 'process', true)
    const config: ChecklistConfig = { enforceRequired: false, customItems: [custom] }
    saveChecklistConfig(config)
    const loaded = loadChecklistConfig()
    expect(loaded.enforceRequired).toBe(false)
    expect(loaded.customItems).toHaveLength(1)
    expect(loaded.customItems[0].label).toBe('Test')
  })
})

describe('recordChecklistCompletion / getChecklistHistory', () => {
  it('records entries to history', () => {
    recordChecklistCompletion({ thesis: true }, 50)
    recordChecklistCompletion({ thesis: true, 'line-shop': true }, 70)
    const history = getChecklistHistory()
    expect(history).toHaveLength(2)
    expect(history[0].score).toBe(50)
    expect(history[1].score).toBe(70)
  })

  it('respects limit parameter', () => {
    for (let i = 0; i < 5; i++) {
      recordChecklistCompletion({}, i * 10)
    }
    const history = getChecklistHistory(3)
    expect(history).toHaveLength(3)
  })

  it('caps at 200 entries', () => {
    for (let i = 0; i < 210; i++) {
      recordChecklistCompletion({}, i)
    }
    const history = getChecklistHistory(300)
    expect(history.length).toBeLessThanOrEqual(200)
  })
})

describe('getAverageProcessScore', () => {
  it('returns 0 with no history', () => {
    expect(getAverageProcessScore()).toBe(0)
  })

  it('calculates correct average', () => {
    recordChecklistCompletion({}, 60)
    recordChecklistCompletion({}, 80)
    expect(getAverageProcessScore()).toBe(70)
  })
})

describe('createCustomItem', () => {
  it('creates item with unique id', () => {
    const a = createCustomItem('A', 'desc A', 'research')
    const b = createCustomItem('B', 'desc B', 'process')
    expect(a.id).not.toBe(b.id)
    expect(a.id).toMatch(/^custom-/)
  })

  it('sets required flag', () => {
    const item = createCustomItem('X', 'desc', 'discipline', true)
    expect(item.required).toBe(true)
  })

  it('defaults to not required', () => {
    const item = createCustomItem('X', 'desc', 'discipline')
    expect(item.required).toBe(false)
  })
})
