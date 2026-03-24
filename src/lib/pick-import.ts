/**
 * Pick Import from CSV — Parse and validate CSV data for bulk pick import.
 *
 * Supports common CSV formats with flexible column mapping.
 * Validates required fields, normalizes data, reports errors per row.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface ImportedPick {
  sport: string
  pick_type: string
  pick_team: string | null
  odds: number
  units: number
  outcome: string | null
  profit: number | null
  game_date: string
  notes: string | null
  pick_line: number | null
}

export interface ImportResult {
  success: ImportedPick[]
  errors: ImportError[]
  totalRows: number
  skippedRows: number
}

export interface ImportError {
  row: number
  field: string
  message: string
  rawValue: string
}

const VALID_SPORTS = ['nba', 'nfl', 'mlb', 'nhl']
const VALID_PICK_TYPES = ['moneyline', 'spread', 'over', 'under', 'prop']
const VALID_OUTCOMES = ['win', 'loss', 'push', 'pending', '']

// Column name aliases for flexible CSV parsing
const COLUMN_ALIASES: Record<string, string[]> = {
  sport: ['sport', 'league', 'spt'],
  pick_type: ['pick_type', 'type', 'bet_type', 'market', 'wager_type'],
  pick_team: ['pick_team', 'team', 'selection', 'pick'],
  odds: ['odds', 'price', 'line_price', 'american_odds', 'moneyline'],
  units: ['units', 'stake', 'amount', 'wager', 'risk', 'unit'],
  outcome: ['outcome', 'result', 'status', 'win_loss'],
  profit: ['profit', 'pnl', 'return', 'net', 'gain_loss'],
  game_date: ['game_date', 'date', 'game_day', 'event_date'],
  notes: ['notes', 'note', 'comments', 'description'],
  pick_line: ['pick_line', 'spread', 'total', 'line', 'point_spread'],
}

/**
 * Parse CSV string into pick data.
 */
export function parseCSV(csvText: string): ImportResult {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    return { success: [], errors: [{ row: 0, field: 'csv', message: 'CSV must have a header row and at least one data row', rawValue: '' }], totalRows: 0, skippedRows: 0 }
  }

  // Parse header
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase())
  const columnMap = mapColumns(headers)

  // Check required columns
  const requiredColumns = ['sport', 'odds', 'game_date']
  const missingColumns = requiredColumns.filter((col) => columnMap[col] === -1)
  if (missingColumns.length > 0) {
    return {
      success: [],
      errors: [{
        row: 0,
        field: 'headers',
        message: `Missing required columns: ${missingColumns.join(', ')}. Found: ${headers.join(', ')}`,
        rawValue: headerLine,
      }],
      totalRows: lines.length - 1,
      skippedRows: lines.length - 1,
    }
  }

  const success: ImportedPick[] = []
  const errors: ImportError[] = []
  let skippedRows = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      skippedRows++
      continue
    }

    const values = parseCSVLine(line)
    const rowErrors: ImportError[] = []

    // Extract and validate fields
    const sport = getField(values, columnMap, 'sport').toLowerCase()
    if (!VALID_SPORTS.includes(sport)) {
      rowErrors.push({ row: i + 1, field: 'sport', message: `Invalid sport: "${sport}". Must be one of: ${VALID_SPORTS.join(', ')}`, rawValue: sport })
    }

    const pickType = getField(values, columnMap, 'pick_type').toLowerCase() || 'moneyline'
    if (!VALID_PICK_TYPES.includes(pickType)) {
      rowErrors.push({ row: i + 1, field: 'pick_type', message: `Invalid pick type: "${pickType}"`, rawValue: pickType })
    }

    const oddsStr = getField(values, columnMap, 'odds')
    const odds = parseFloat(oddsStr)
    if (isNaN(odds)) {
      rowErrors.push({ row: i + 1, field: 'odds', message: `Invalid odds: "${oddsStr}"`, rawValue: oddsStr })
    }

    const unitsStr = getField(values, columnMap, 'units') || '1'
    const units = parseFloat(unitsStr)
    if (isNaN(units) || units <= 0) {
      rowErrors.push({ row: i + 1, field: 'units', message: `Invalid units: "${unitsStr}"`, rawValue: unitsStr })
    }

    const gameDate = getField(values, columnMap, 'game_date')
    const parsedDate = normalizeDate(gameDate)
    if (!parsedDate) {
      rowErrors.push({ row: i + 1, field: 'game_date', message: `Invalid date: "${gameDate}"`, rawValue: gameDate })
    }

    const outcome = getField(values, columnMap, 'outcome').toLowerCase()
    if (outcome && !VALID_OUTCOMES.includes(outcome)) {
      rowErrors.push({ row: i + 1, field: 'outcome', message: `Invalid outcome: "${outcome}"`, rawValue: outcome })
    }

    const profitStr = getField(values, columnMap, 'profit')
    const profit = profitStr ? parseFloat(profitStr) : null
    if (profitStr && isNaN(profit!)) {
      rowErrors.push({ row: i + 1, field: 'profit', message: `Invalid profit: "${profitStr}"`, rawValue: profitStr })
    }

    const pickLineStr = getField(values, columnMap, 'pick_line')
    const pickLine = pickLineStr ? parseFloat(pickLineStr) : null

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      skippedRows++
      continue
    }

    success.push({
      sport,
      pick_type: pickType,
      pick_team: getField(values, columnMap, 'pick_team') || null,
      odds,
      units: units || 1,
      outcome: outcome || null,
      profit: profit,
      game_date: parsedDate!,
      notes: getField(values, columnMap, 'notes') || null,
      pick_line: pickLine,
    })
  }

  return {
    success,
    errors,
    totalRows: lines.length - 1,
    skippedRows,
  }
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

function mapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    map[field] = -1
    for (const alias of aliases) {
      const idx = headers.indexOf(alias)
      if (idx !== -1) {
        map[field] = idx
        break
      }
    }
  }
  return map
}

function getField(values: string[], columnMap: Record<string, number>, field: string): string {
  const idx = columnMap[field]
  if (idx === -1 || idx >= values.length) return ''
  return values[idx].trim()
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null

  // Try ISO format: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T12:00:00Z')
    return isNaN(d.getTime()) ? null : dateStr
  }

  // Try MM/DD/YYYY or M/D/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    const padded = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    const date = new Date(padded + 'T12:00:00Z')
    return isNaN(date.getTime()) ? null : padded
  }

  // Try MM-DD-YYYY
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch) {
    const [, m, d, y] = dashMatch
    const padded = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    const date = new Date(padded + 'T12:00:00Z')
    return isNaN(date.getTime()) ? null : padded
  }

  return null
}

/**
 * Generate a sample CSV template string.
 */
export function generateCSVTemplate(): string {
  return [
    'sport,pick_type,pick_team,odds,units,outcome,profit,game_date,notes,pick_line',
    'nba,moneyline,Lakers,-150,1,win,0.67,2026-03-20,Strong value play,',
    'nba,spread,Celtics,+110,2,loss,-2,2026-03-21,Covered but lost outright,-3.5',
    'nfl,over,,+100,1,win,1,2026-03-19,Weather was dry,48.5',
  ].join('\n')
}
