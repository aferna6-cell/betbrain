/**
 * Parlay Hit Rate Tracking — separate parlay vs straight bet statistics.
 *
 * Parlays are identified by the `parlay_id` field if present, or by
 * a localStorage mapping of pick IDs to parlay groups.
 */

export interface ParlayGroup {
  id: string
  pickIds: string[]
  legs: number
  allWon: boolean
  anyPending: boolean
  totalOdds: number // combined odds
  units: number
  profit: number | null
  createdAt: string
}

export interface ParlayVsStraightStats {
  straight: {
    total: number
    wins: number
    losses: number
    pushes: number
    profit: number
    roi: number
    winRate: number
  }
  parlay: {
    total: number // number of parlays
    hits: number // parlays where all legs won
    misses: number
    pending: number
    profit: number
    roi: number
    hitRate: number
    avgLegs: number
  }
}

const STORAGE_KEY = 'betbrain_parlay_groups'

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadGroups(): ParlayGroup[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ParlayGroup[]) : []
  } catch {
    return []
  }
}

function saveGroups(groups: ParlayGroup[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAllParlayGroups(): ParlayGroup[] {
  return loadGroups().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function createParlayGroup(input: {
  pickIds: string[]
  totalOdds: number
  units: number
}): ParlayGroup {
  const groups = loadGroups()
  const group: ParlayGroup = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `parlay-${Date.now()}`,
    pickIds: input.pickIds,
    legs: input.pickIds.length,
    allWon: false,
    anyPending: true,
    totalOdds: input.totalOdds,
    units: input.units,
    profit: null,
    createdAt: new Date().toISOString(),
  }
  groups.push(group)
  saveGroups(groups)
  return group
}

export function deleteParlayGroup(id: string): boolean {
  const groups = loadGroups()
  const filtered = groups.filter((g) => g.id !== id)
  if (filtered.length === groups.length) return false
  saveGroups(filtered)
  return true
}

// ---------------------------------------------------------------------------
// Stats calculation (pure function)
// ---------------------------------------------------------------------------

interface PickLike {
  id: string
  outcome?: string | null
  profit?: number | null
  units: number
}

export function calculateParlayVsStraightStats<T extends PickLike>(
  picks: T[],
  parlayGroups: ParlayGroup[]
): ParlayVsStraightStats {
  // Identify which pick IDs are in parlays
  const parlayPickIds = new Set<string>()
  for (const group of parlayGroups) {
    for (const pid of group.pickIds) {
      parlayPickIds.add(pid)
    }
  }

  // Straight bets = picks NOT in any parlay
  const straightPicks = picks.filter((p) => !parlayPickIds.has(p.id))
  const resolvedStraight = straightPicks.filter((p) => p.outcome && p.outcome !== 'pending')
  const sWins = resolvedStraight.filter((p) => p.outcome === 'win').length
  const sLosses = resolvedStraight.filter((p) => p.outcome === 'loss').length
  const sPushes = resolvedStraight.filter((p) => p.outcome === 'push').length
  const sProfit = resolvedStraight.reduce((s, p) => s + (p.profit ?? 0), 0)
  const sUnits = resolvedStraight.reduce((s, p) => s + p.units, 0)

  // Parlay stats
  const pickMap = new Map<string, T>()
  for (const p of picks) pickMap.set(p.id, p)

  let pHits = 0
  let pMisses = 0
  let pPending = 0
  let pProfit = 0
  let pUnits = 0
  let totalLegs = 0

  for (const group of parlayGroups) {
    const groupPicks = group.pickIds.map((id) => pickMap.get(id)).filter(Boolean) as T[]
    const hasPending = groupPicks.some((p) => !p.outcome || p.outcome === 'pending')
    const allWon = !hasPending && groupPicks.every((p) => p.outcome === 'win')
    const anyLost = groupPicks.some((p) => p.outcome === 'loss')

    totalLegs += group.legs

    if (hasPending) {
      pPending++
    } else if (allWon) {
      pHits++
      // Parlay profit = units * (totalOdds - 1) for decimal odds
      // For american odds stored as totalOdds, we approximate
      const payout = group.units * americanToDecimal(group.totalOdds)
      pProfit += payout - group.units
    } else {
      pMisses++
      pProfit -= group.units
    }
    pUnits += group.units
  }

  const resolvedParlays = pHits + pMisses

  return {
    straight: {
      total: resolvedStraight.length,
      wins: sWins,
      losses: sLosses,
      pushes: sPushes,
      profit: Math.round(sProfit * 100) / 100,
      roi: sUnits > 0 ? Math.round((sProfit / sUnits) * 10000) / 100 : 0,
      winRate: resolvedStraight.length > 0 ? Math.round((sWins / (sWins + sLosses)) * 10000) / 100 : 0,
    },
    parlay: {
      total: parlayGroups.length,
      hits: pHits,
      misses: pMisses,
      pending: pPending,
      profit: Math.round(pProfit * 100) / 100,
      roi: pUnits > 0 ? Math.round((pProfit / pUnits) * 10000) / 100 : 0,
      hitRate: resolvedParlays > 0 ? Math.round((pHits / resolvedParlays) * 10000) / 100 : 0,
      avgLegs: parlayGroups.length > 0 ? Math.round((totalLegs / parlayGroups.length) * 10) / 10 : 0,
    },
  }
}

function americanToDecimal(odds: number): number {
  if (odds >= 100) return odds / 100 + 1
  if (odds <= -100) return 100 / Math.abs(odds) + 1
  return 2 // fallback
}
