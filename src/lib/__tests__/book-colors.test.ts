import { describe, it, expect } from 'vitest'
import { getBookColor, formatBookName, BOOK_COLORS } from '../book-colors'

describe('book-colors', () => {
  it('returns known bookmaker color', () => {
    const dk = getBookColor('draftkings')
    expect(dk.label).toBe('DraftKings')
    expect(dk.dot).toBe('#00b75f')
    expect(dk.bg).toContain('green')
  })

  it('returns fallback for unknown bookmaker', () => {
    const unknown = getBookColor('unknown_book_xyz')
    expect(unknown.label).toBe('unknown book xyz')
    expect(unknown.bg).toContain('muted')
  })

  it('formatBookName returns display name for known book', () => {
    expect(formatBookName('fanduel')).toBe('FanDuel')
    expect(formatBookName('betmgm')).toBe('BetMGM')
  })

  it('formatBookName formats unknown key', () => {
    expect(formatBookName('some_new_book')).toBe('some new book')
  })

  it('has colors for major US sportsbooks', () => {
    const major = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'espnbet']
    for (const book of major) {
      expect(BOOK_COLORS[book]).toBeDefined()
      expect(BOOK_COLORS[book].dot).toBeTruthy()
    }
  })

  it('each book color has all required fields', () => {
    for (const [key, color] of Object.entries(BOOK_COLORS)) {
      expect(color.bg, `${key} missing bg`).toBeTruthy()
      expect(color.text, `${key} missing text`).toBeTruthy()
      expect(color.dot, `${key} missing dot`).toBeTruthy()
      expect(color.label, `${key} missing label`).toBeTruthy()
    }
  })
})
