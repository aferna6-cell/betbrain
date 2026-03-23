/**
 * Book-specific ROI — track ROI per bookmaker.
 *
 * Associates picks with the bookmaker where the bet was placed.
 * Book assignments are stored in localStorage, keyed by pick ID.
 */

export interface BookAssignment {
  pickId: string
  bookmaker: string
}

export interface BookROI {
  bookmaker: string
  picks: number
  wins: number
  losses: number
  pushes: number
  totalProfit: number
  totalUnits: number
  roi: number
  winRate: number
}

const STORAGE_KEY = 'betbrain_book_assignments'

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadAssignments(): BookAssignment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BookAssignment[]) : []
  } catch {
    return []
  }
}

function saveAssignments(assignments: BookAssignment[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
}

// ---------------------------------------------------------------------------
// Assignment CRUD
// ---------------------------------------------------------------------------

export function getBookForPick(pickId: string): string | null {
  const assignments = loadAssignments()
  return assignments.find((a) => a.pickId === pickId)?.bookmaker ?? null
}

export function setBookForPick(pickId: string, bookmaker: string): void {
  const assignments = loadAssignments()
  const idx = assignments.findIndex((a) => a.pickId === pickId)
  if (idx >= 0) {
    assignments[idx].bookmaker = bookmaker
  } else {
    assignments.push({ pickId, bookmaker })
  }
  saveAssignments(assignments)
}

export function removeBookForPick(pickId: string): void {
  const assignments = loadAssignments().filter((a) => a.pickId !== pickId)
  saveAssignments(assignments)
}

export function getAllAssignments(): BookAssignment[] {
  return loadAssignments()
}

// ---------------------------------------------------------------------------
// ROI calculation
// ---------------------------------------------------------------------------

interface PickLike {
  id: string
  outcome?: string | null
  profit?: number | null
  units: number
}

export function calculateBookROI<T extends PickLike>(
  picks: T[],
  assignments: BookAssignment[]
): BookROI[] {
  const assignmentMap = new Map<string, string>()
  for (const a of assignments) {
    assignmentMap.set(a.pickId, a.bookmaker)
  }

  const byBook = new Map<string, { wins: number; losses: number; pushes: number; profit: number; units: number; count: number }>()

  for (const pick of picks) {
    const book = assignmentMap.get(pick.id)
    if (!book) continue
    if (!pick.outcome || pick.outcome === 'pending') continue

    const entry = byBook.get(book) ?? { wins: 0, losses: 0, pushes: 0, profit: 0, units: 0, count: 0 }

    entry.count++
    entry.profit += pick.profit ?? 0
    entry.units += pick.units

    if (pick.outcome === 'win') entry.wins++
    else if (pick.outcome === 'loss') entry.losses++
    else if (pick.outcome === 'push') entry.pushes++

    byBook.set(book, entry)
  }

  return [...byBook.entries()]
    .map(([bookmaker, data]) => ({
      bookmaker,
      picks: data.count,
      wins: data.wins,
      losses: data.losses,
      pushes: data.pushes,
      totalProfit: Math.round(data.profit * 100) / 100,
      totalUnits: data.units,
      roi: data.units > 0 ? Math.round((data.profit / data.units) * 10000) / 100 : 0,
      winRate: data.count > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.roi - a.roi)
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportBookROIToCSV(bookROIs: BookROI[]): string {
  const header = 'Bookmaker,Picks,Wins,Losses,Pushes,Profit,Units,ROI%,Win Rate%'
  const rows = bookROIs.map((b) =>
    [
      b.bookmaker,
      b.picks,
      b.wins,
      b.losses,
      b.pushes,
      b.totalProfit,
      b.totalUnits,
      b.roi,
      b.winRate,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}
