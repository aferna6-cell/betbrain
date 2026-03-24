import { describe, it, expect } from 'vitest'
import { parseCSV, parseCSVLine, generateCSVTemplate } from '../pick-import'

describe('parseCSVLine', () => {
  it('parses simple comma-separated values', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas', () => {
    expect(parseCSVLine('a,"b, c",d')).toEqual(['a', 'b, c', 'd'])
  })

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCSVLine('a,"he said ""hello""",b')).toEqual(['a', 'he said "hello"', 'b'])
  })

  it('trims whitespace from fields', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('handles empty fields', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })
})

describe('parseCSV', () => {
  it('rejects CSV with no data rows', () => {
    const result = parseCSV('sport,odds,game_date')
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].message).toContain('header row')
  })

  it('parses valid CSV with all columns', () => {
    const csv = `sport,pick_type,pick_team,odds,units,outcome,profit,game_date,notes,pick_line
nba,moneyline,Lakers,-150,1,win,0.67,2026-03-20,Good play,`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(1)
    expect(result.errors.length).toBe(0)
    expect(result.success[0].sport).toBe('nba')
    expect(result.success[0].pick_type).toBe('moneyline')
    expect(result.success[0].pick_team).toBe('Lakers')
    expect(result.success[0].odds).toBe(-150)
    expect(result.success[0].units).toBe(1)
    expect(result.success[0].outcome).toBe('win')
    expect(result.success[0].profit).toBe(0.67)
    expect(result.success[0].game_date).toBe('2026-03-20')
  })

  it('uses column aliases (type instead of pick_type)', () => {
    const csv = `sport,type,team,price,stake,result,pnl,date
nba,spread,Celtics,+110,2,loss,-2,2026-03-21`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(1)
    expect(result.success[0].pick_type).toBe('spread')
    expect(result.success[0].pick_team).toBe('Celtics')
    expect(result.success[0].odds).toBe(110)
  })

  it('defaults pick_type to moneyline when missing', () => {
    const csv = `sport,odds,game_date
nba,-110,2026-03-20`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(1)
    expect(result.success[0].pick_type).toBe('moneyline')
  })

  it('defaults units to 1 when missing', () => {
    const csv = `sport,odds,game_date
nba,-110,2026-03-20`
    const result = parseCSV(csv)
    expect(result.success[0].units).toBe(1)
  })

  it('reports errors for invalid sport', () => {
    const csv = `sport,odds,game_date
soccer,-110,2026-03-20`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(0)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].field).toBe('sport')
  })

  it('reports errors for invalid odds', () => {
    const csv = `sport,odds,game_date
nba,abc,2026-03-20`
    const result = parseCSV(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].field).toBe('odds')
  })

  it('reports errors for invalid date', () => {
    const csv = `sport,odds,game_date
nba,-110,not-a-date`
    const result = parseCSV(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].field).toBe('game_date')
  })

  it('handles MM/DD/YYYY date format', () => {
    const csv = `sport,odds,game_date
nba,-110,3/20/2026`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(1)
    expect(result.success[0].game_date).toBe('2026-03-20')
  })

  it('handles MM-DD-YYYY date format', () => {
    const csv = `sport,odds,game_date
nba,-110,03-20-2026`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(1)
    expect(result.success[0].game_date).toBe('2026-03-20')
  })

  it('reports missing required columns', () => {
    const csv = `team,type
Lakers,moneyline`
    const result = parseCSV(csv)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].message).toContain('Missing required columns')
  })

  it('skips empty lines', () => {
    const csv = `sport,odds,game_date
nba,-110,2026-03-20

nba,+150,2026-03-21`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(2)
    expect(result.skippedRows).toBe(1)
  })

  it('handles multiple rows with mixed valid/invalid', () => {
    const csv = `sport,odds,game_date
nba,-110,2026-03-20
invalid,abc,not-a-date
nfl,+150,2026-03-21`
    const result = parseCSV(csv)
    expect(result.success.length).toBe(2)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.totalRows).toBe(3)
  })

  it('handles null outcome and profit', () => {
    const csv = `sport,odds,game_date,outcome,profit
nba,-110,2026-03-20,,`
    const result = parseCSV(csv)
    expect(result.success[0].outcome).toBeNull()
    expect(result.success[0].profit).toBeNull()
  })

  it('parses pick_line when provided', () => {
    const csv = `sport,odds,game_date,pick_line
nba,-110,2026-03-20,-3.5`
    const result = parseCSV(csv)
    expect(result.success[0].pick_line).toBe(-3.5)
  })

  it('handles quoted notes with commas', () => {
    const csv = `sport,odds,game_date,notes
nba,-110,2026-03-20,"Strong play, weather favors under"`
    const result = parseCSV(csv)
    expect(result.success[0].notes).toBe('Strong play, weather favors under')
  })
})

describe('generateCSVTemplate', () => {
  it('produces valid CSV that can be parsed', () => {
    const template = generateCSVTemplate()
    const result = parseCSV(template)
    expect(result.success.length).toBe(3)
    expect(result.errors.length).toBe(0)
  })
})
