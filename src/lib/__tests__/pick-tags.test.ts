import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  normalizeTag,
  getTagColor,
  getAllTags,
  addCustomTag,
  removeCustomTag,
  getPickTags,
  setPickTags,
  addTagToPick,
  removeTagFromPick,
  getTagsInUse,
  calcTagPerformance,
  getTagExtremes,
  suggestTags,
  getTagCoOccurrence,
} from '../pick-tags'

// Mock localStorage
const store: Record<string, string> = {}
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
  vi.stubGlobal('window', {})
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  })
})

describe('normalizeTag', () => {
  it('lowercases and trims', () => {
    expect(normalizeTag('  Value  ')).toBe('value')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeTag('prime    time')).toBe('prime time')
  })

  it('returns empty for whitespace-only', () => {
    expect(normalizeTag('   ')).toBe('')
  })
})

describe('getTagColor', () => {
  it('returns a hex color', () => {
    const color = getTagColor('value')
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('same tag always gets same color', () => {
    expect(getTagColor('value')).toBe(getTagColor('value'))
    expect(getTagColor('VALUE')).toBe(getTagColor('value'))
  })

  it('different tags can get different colors', () => {
    // Not guaranteed but likely for different enough strings
    const c1 = getTagColor('value')
    const c2 = getTagColor('revenge game')
    // Just check both are valid
    expect(c1).toMatch(/^#[0-9a-f]{6}$/)
    expect(c2).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('getAllTags', () => {
  it('includes built-in tags', () => {
    const tags = getAllTags()
    expect(tags).toContain('value')
    expect(tags).toContain('revenge game')
    expect(tags).toContain('fade public')
  })

  it('includes custom tags', () => {
    addCustomTag('my custom tag')
    const tags = getAllTags()
    expect(tags).toContain('my custom tag')
  })

  it('returns sorted list', () => {
    const tags = getAllTags()
    const sorted = [...tags].sort()
    expect(tags).toEqual(sorted)
  })
})

describe('addCustomTag / removeCustomTag', () => {
  it('adds and removes a custom tag', () => {
    addCustomTag('new tag')
    expect(getAllTags()).toContain('new tag')

    removeCustomTag('new tag')
    // Built-in tags remain
    expect(getAllTags()).toContain('value')
  })

  it('normalizes tag name', () => {
    const result = addCustomTag('  My TAG  ')
    expect(result).toBe('my tag')
  })

  it('does not duplicate built-in tags', () => {
    addCustomTag('value')
    const tags = getAllTags()
    const valueCount = tags.filter((t) => t === 'value').length
    expect(valueCount).toBe(1)
  })

  it('returns empty string for blank tag', () => {
    expect(addCustomTag('  ')).toBe('')
  })
})

describe('getPickTags / setPickTags', () => {
  it('returns empty for untagged pick', () => {
    expect(getPickTags('pick-1')).toEqual([])
  })

  it('sets and retrieves tags', () => {
    setPickTags('pick-1', ['value', 'prime time'])
    expect(getPickTags('pick-1')).toEqual(['value', 'prime time'])
  })

  it('deduplicates tags', () => {
    setPickTags('pick-1', ['value', 'VALUE', 'Value'])
    expect(getPickTags('pick-1')).toEqual(['value'])
  })

  it('overwrites previous tags', () => {
    setPickTags('pick-1', ['value'])
    setPickTags('pick-1', ['revenge game'])
    expect(getPickTags('pick-1')).toEqual(['revenge game'])
  })

  it('normalizes tags', () => {
    setPickTags('pick-1', ['  Sharp Play  '])
    expect(getPickTags('pick-1')).toEqual(['sharp play'])
  })
})

describe('addTagToPick / removeTagFromPick', () => {
  it('adds a tag to a pick', () => {
    const result = addTagToPick('pick-1', 'value')
    expect(result).toEqual(['value'])
  })

  it('does not duplicate', () => {
    addTagToPick('pick-1', 'value')
    const result = addTagToPick('pick-1', 'value')
    expect(result).toEqual(['value'])
  })

  it('removes a tag from a pick', () => {
    setPickTags('pick-1', ['value', 'prime time'])
    const result = removeTagFromPick('pick-1', 'value')
    expect(result).toEqual(['prime time'])
  })

  it('removing nonexistent tag is safe', () => {
    setPickTags('pick-1', ['value'])
    const result = removeTagFromPick('pick-1', 'nonexistent')
    expect(result).toEqual(['value'])
  })
})

describe('getTagsInUse', () => {
  it('returns empty when no picks tagged', () => {
    expect(getTagsInUse()).toEqual([])
  })

  it('returns all unique tags across picks', () => {
    setPickTags('pick-1', ['value', 'prime time'])
    setPickTags('pick-2', ['value', 'revenge game'])
    const inUse = getTagsInUse()
    expect(inUse).toContain('value')
    expect(inUse).toContain('prime time')
    expect(inUse).toContain('revenge game')
    expect(inUse.length).toBe(3)
  })
})

describe('calcTagPerformance', () => {
  const picks = [
    { id: 'p1', outcome: 'win', profit: 100, units: 1, odds: -110 },
    { id: 'p2', outcome: 'loss', profit: -100, units: 1, odds: -110 },
    { id: 'p3', outcome: 'win', profit: 200, units: 2, odds: 150 },
    { id: 'p4', outcome: 'pending', profit: null, units: 1, odds: -120 },
  ]

  it('calculates performance per tag', () => {
    const assignments = [
      { pickId: 'p1', tags: ['value'], updatedAt: '2026-01-01' },
      { pickId: 'p2', tags: ['value', 'prime time'], updatedAt: '2026-01-01' },
      { pickId: 'p3', tags: ['value'], updatedAt: '2026-01-01' },
    ]

    const perfs = calcTagPerformance(picks, assignments)
    const valuePerf = perfs.find((p) => p.tag === 'value')!
    expect(valuePerf.wins).toBe(2)
    expect(valuePerf.losses).toBe(1)
    expect(valuePerf.total).toBe(3)
    expect(valuePerf.profit).toBe(200) // 100 - 100 + 200
    expect(valuePerf.winRate).toBeCloseTo(66.67, 1)

    const primePerf = perfs.find((p) => p.tag === 'prime time')!
    expect(primePerf.wins).toBe(0)
    expect(primePerf.losses).toBe(1)
    expect(primePerf.winRate).toBe(0)
  })

  it('handles pending picks correctly', () => {
    const assignments = [
      { pickId: 'p4', tags: ['gut feel'], updatedAt: '2026-01-01' },
    ]
    const perfs = calcTagPerformance(picks, assignments)
    const gutPerf = perfs.find((p) => p.tag === 'gut feel')!
    expect(gutPerf.pending).toBe(1)
    expect(gutPerf.winRate).toBeNull()
  })

  it('returns empty for no assignments', () => {
    const perfs = calcTagPerformance(picks, [])
    expect(perfs).toEqual([])
  })

  it('sorts by ROI descending', () => {
    const assignments = [
      { pickId: 'p1', tags: ['tag-a'], updatedAt: '2026-01-01' },
      { pickId: 'p2', tags: ['tag-b'], updatedAt: '2026-01-01' },
    ]
    const perfs = calcTagPerformance(picks, assignments)
    expect(perfs[0].tag).toBe('tag-a') // winner first
    expect(perfs[1].tag).toBe('tag-b')
  })
})

describe('getTagExtremes', () => {
  it('returns best and worst performing tags', () => {
    const perfs = [
      { tag: 'a', wins: 5, losses: 1, pushes: 0, pending: 0, total: 6, winRate: 83.3, profit: 400, roi: 66.7, avgOdds: -110, pickCount: 6 },
      { tag: 'b', wins: 1, losses: 5, pushes: 0, pending: 0, total: 6, winRate: 16.7, profit: -400, roi: -66.7, avgOdds: -110, pickCount: 6 },
    ]
    const { best, worst } = getTagExtremes(perfs)
    expect(best?.tag).toBe('a')
    expect(worst?.tag).toBe('b')
  })

  it('returns null for no resolved picks', () => {
    const perfs = [
      { tag: 'a', wins: 0, losses: 0, pushes: 0, pending: 2, total: 2, winRate: null, profit: 0, roi: 0, avgOdds: -110, pickCount: 2 },
    ]
    const { best, worst } = getTagExtremes(perfs)
    expect(best).toBeNull()
    expect(worst).toBeNull()
  })
})

describe('suggestTags', () => {
  it('suggests value for underdog picks', () => {
    const suggestions = suggestTags({
      id: 'p1', outcome: null, profit: null, units: 1, odds: 200,
    })
    expect(suggestions.map((s) => s.tag)).toContain('value')
  })

  it('suggests from notes content', () => {
    const suggestions = suggestTags({
      id: 'p1', outcome: null, profit: null, units: 1, odds: -110,
      notes: 'This is a revenge game after they got blown out last week',
    })
    expect(suggestions.map((s) => s.tag)).toContain('revenge game')
  })

  it('suggests weather play from notes', () => {
    const suggestions = suggestTags({
      id: 'p1', outcome: null, profit: null, units: 1, odds: -110,
      notes: 'Heavy rain expected, taking the under',
    })
    expect(suggestions.map((s) => s.tag)).toContain('weather play')
  })

  it('suggests live bet from notes', () => {
    const suggestions = suggestTags({
      id: 'p1', outcome: null, profit: null, units: 1, odds: -110,
      notes: 'Live bet after 1st quarter',
    })
    expect(suggestions.map((s) => s.tag)).toContain('live bet')
  })

  it('deduplicates suggestions', () => {
    const suggestions = suggestTags({
      id: 'p1', outcome: null, profit: null, units: 1, odds: 200,
      notes: 'Great value here on the underdog',
    })
    const valueSuggestions = suggestions.filter((s) => s.tag === 'value')
    expect(valueSuggestions.length).toBe(1)
  })

  it('returns empty for unremarkable pick', () => {
    const suggestions = suggestTags({
      id: 'p1', outcome: null, profit: null, units: 1, odds: -110,
    })
    // No notes, moderate odds — may still suggest home underdog due to positive odds check
    // With -110 odds, no suggestions expected
    expect(suggestions.length).toBe(0)
  })
})

describe('getTagCoOccurrence', () => {
  it('finds tag pairs that appear together', () => {
    const assignments = [
      { pickId: 'p1', tags: ['value', 'prime time'], updatedAt: '2026-01-01' },
      { pickId: 'p2', tags: ['value', 'prime time'], updatedAt: '2026-01-02' },
      { pickId: 'p3', tags: ['value', 'revenge game'], updatedAt: '2026-01-03' },
    ]
    const pairs = getTagCoOccurrence(assignments)
    const valuePrime = pairs.find((p) => p.tagA === 'prime time' && p.tagB === 'value')
    expect(valuePrime?.count).toBe(2)
  })

  it('returns empty for single-tag assignments', () => {
    const assignments = [
      { pickId: 'p1', tags: ['value'], updatedAt: '2026-01-01' },
    ]
    expect(getTagCoOccurrence(assignments)).toEqual([])
  })

  it('sorts by count descending', () => {
    const assignments = [
      { pickId: 'p1', tags: ['a', 'b'], updatedAt: '2026-01-01' },
      { pickId: 'p2', tags: ['a', 'b'], updatedAt: '2026-01-02' },
      { pickId: 'p3', tags: ['a', 'c'], updatedAt: '2026-01-03' },
    ]
    const pairs = getTagCoOccurrence(assignments)
    expect(pairs[0].count).toBe(2)
    expect(pairs[1].count).toBe(1)
  })
})
