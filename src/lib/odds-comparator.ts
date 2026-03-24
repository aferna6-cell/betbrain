/**
 * Odds Screen Comparator — Visual diff of odds at two points in time.
 *
 * Compares odds snapshots from odds_history to show how lines moved
 * between two timestamps. Highlights significant movements.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface OddsSnapshot {
  bookmaker: string
  home_odds: number | null
  away_odds: number | null
  spread_home: number | null
  spread_away: number | null
  spread_line: number | null
  total_over: number | null
  total_under: number | null
  total_line: number | null
  fetched_at: string
}

export interface OddsDiff {
  bookmaker: string
  moneyline: {
    home: { before: number | null; after: number | null; change: number | null }
    away: { before: number | null; after: number | null; change: number | null }
  }
  spread: {
    home: { before: number | null; after: number | null; change: number | null }
    away: { before: number | null; after: number | null; change: number | null }
    line: { before: number | null; after: number | null; change: number | null }
  }
  total: {
    over: { before: number | null; after: number | null; change: number | null }
    under: { before: number | null; after: number | null; change: number | null }
    line: { before: number | null; after: number | null; change: number | null }
  }
  /** Is there any significant movement? */
  hasSignificantChange: boolean
}

export interface ComparatorResult {
  diffs: OddsDiff[]
  timeBefore: string
  timeAfter: string
  totalBooks: number
  booksWithMovement: number
  biggestMove: { bookmaker: string; market: string; change: number } | null
}

/**
 * Compare two sets of odds snapshots.
 */
export function compareOddsSnapshots(
  before: OddsSnapshot[],
  after: OddsSnapshot[]
): ComparatorResult {
  const afterMap = new Map(after.map((s) => [s.bookmaker, s]))
  const allBooks = new Set([...before.map((s) => s.bookmaker), ...after.map((s) => s.bookmaker)])

  const diffs: OddsDiff[] = []
  let biggestMoveAbs = 0
  let biggestMove: ComparatorResult['biggestMove'] = null

  for (const bookmaker of allBooks) {
    const b = before.find((s) => s.bookmaker === bookmaker)
    const a = afterMap.get(bookmaker)

    const diff: OddsDiff = {
      bookmaker,
      moneyline: {
        home: calcChange(b?.home_odds ?? null, a?.home_odds ?? null),
        away: calcChange(b?.away_odds ?? null, a?.away_odds ?? null),
      },
      spread: {
        home: calcChange(b?.spread_home ?? null, a?.spread_home ?? null),
        away: calcChange(b?.spread_away ?? null, a?.spread_away ?? null),
        line: calcChange(b?.spread_line ?? null, a?.spread_line ?? null),
      },
      total: {
        over: calcChange(b?.total_over ?? null, a?.total_over ?? null),
        under: calcChange(b?.total_under ?? null, a?.total_under ?? null),
        line: calcChange(b?.total_line ?? null, a?.total_line ?? null),
      },
      hasSignificantChange: false,
    }

    // Check for significant changes
    const changes = [
      { market: 'ML Home', val: diff.moneyline.home.change },
      { market: 'ML Away', val: diff.moneyline.away.change },
      { market: 'Spread Home', val: diff.spread.home.change },
      { market: 'Spread Away', val: diff.spread.away.change },
      { market: 'Spread Line', val: diff.spread.line.change },
      { market: 'Total Over', val: diff.total.over.change },
      { market: 'Total Under', val: diff.total.under.change },
      { market: 'Total Line', val: diff.total.line.change },
    ]

    for (const c of changes) {
      if (c.val !== null && Math.abs(c.val) >= 5) {
        diff.hasSignificantChange = true
      }
      if (c.val !== null && Math.abs(c.val) > biggestMoveAbs) {
        biggestMoveAbs = Math.abs(c.val)
        biggestMove = { bookmaker, market: c.market, change: c.val }
      }
    }

    diffs.push(diff)
  }

  // Sort by biggest change
  diffs.sort((a, b) => {
    const aMax = getMaxChange(a)
    const bMax = getMaxChange(b)
    return bMax - aMax
  })

  return {
    diffs,
    timeBefore: before[0]?.fetched_at || '',
    timeAfter: after[0]?.fetched_at || '',
    totalBooks: diffs.length,
    booksWithMovement: diffs.filter((d) => d.hasSignificantChange).length,
    biggestMove,
  }
}

function calcChange(before: number | null, after: number | null): {
  before: number | null
  after: number | null
  change: number | null
} {
  if (before === null || after === null) {
    return { before, after, change: null }
  }
  return { before, after, change: Math.round((after - before) * 100) / 100 }
}

function getMaxChange(diff: OddsDiff): number {
  const changes = [
    diff.moneyline.home.change,
    diff.moneyline.away.change,
    diff.spread.home.change,
    diff.spread.away.change,
    diff.total.over.change,
    diff.total.under.change,
  ]
  return Math.max(0, ...changes.filter((c): c is number => c !== null).map(Math.abs))
}

/**
 * Get a color class for a change value.
 */
export function getChangeColor(change: number | null): string {
  if (change === null) return 'text-zinc-500'
  if (Math.abs(change) < 3) return 'text-zinc-400'
  if (change > 0) return 'text-green-400'
  return 'text-red-400'
}

/**
 * Format a change value for display.
 */
export function formatChange(change: number | null): string {
  if (change === null) return '-'
  if (change === 0) return '='
  const prefix = change > 0 ? '+' : ''
  return `${prefix}${change}`
}
