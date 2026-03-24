/**
 * Pick Dependency Graph — Visualize correlated picks.
 *
 * Detects when picks are connected: same game, same sport/day, parlayed
 * together, or sharing a team. Helps identify portfolio concentration risk.
 *
 * Pure functions — no side effects.
 */

export interface PickNode {
  id: string
  label: string
  sport?: string
  game_date?: string
  pick_team?: string | null
  bet_type?: string
  outcome?: string | null
}

export interface PickEdge {
  source: string
  target: string
  type: 'same-game' | 'same-team' | 'same-day-sport' | 'correlated-outcome'
  label: string
  /** Strength of connection (0-1) */
  strength: number
}

export interface DependencyCluster {
  /** Cluster ID */
  id: number
  /** Pick IDs in this cluster */
  pickIds: string[]
  /** Why they are clustered */
  reason: string
  /** Risk level based on cluster size and correlation type */
  riskLevel: 'low' | 'medium' | 'high'
}

export interface DependencyGraph {
  nodes: PickNode[]
  edges: PickEdge[]
  clusters: DependencyCluster[]
  /** Total number of correlated pairs */
  totalEdges: number
  /** Percentage of picks that are part of at least one correlation */
  correlatedRate: number
  /** Max cluster size */
  maxClusterSize: number
  /** Risk assessment */
  riskSummary: string
}

/**
 * Normalize a game identifier from pick data.
 * Tries to extract a consistent game ID from game_id, or constructs from teams + date.
 */
function getGameKey(pick: PickNode): string | null {
  if (pick.game_date && pick.pick_team) {
    return `${pick.game_date}-${pick.pick_team}`
  }
  return null
}

/**
 * Detect same-game correlations: multiple picks on the same game.
 */
function detectSameGame(picks: PickNode[]): PickEdge[] {
  const edges: PickEdge[] = []
  const dateTeamMap = new Map<string, PickNode[]>()

  for (const p of picks) {
    if (!p.game_date) continue
    const key = p.game_date
    if (!dateTeamMap.has(key)) dateTeamMap.set(key, [])
    dateTeamMap.get(key)!.push(p)
  }

  for (const [, group] of dateTeamMap) {
    // Find picks with same team on same date
    const teamGroups = new Map<string, PickNode[]>()
    for (const p of group) {
      if (!p.pick_team) continue
      const team = p.pick_team.toLowerCase()
      if (!teamGroups.has(team)) teamGroups.set(team, [])
      teamGroups.get(team)!.push(p)
    }

    for (const [, teamPicks] of teamGroups) {
      if (teamPicks.length < 2) continue
      for (let i = 0; i < teamPicks.length; i++) {
        for (let j = i + 1; j < teamPicks.length; j++) {
          edges.push({
            source: teamPicks[i].id,
            target: teamPicks[j].id,
            type: 'same-game',
            label: `Same game (${teamPicks[i].pick_team})`,
            strength: 0.9,
          })
        }
      }
    }
  }

  return edges
}

/**
 * Detect same-team correlations: multiple bets on same team across games.
 */
function detectSameTeam(picks: PickNode[]): PickEdge[] {
  const edges: PickEdge[] = []
  const teamMap = new Map<string, PickNode[]>()

  for (const p of picks) {
    if (!p.pick_team) continue
    const team = p.pick_team.toLowerCase()
    if (!teamMap.has(team)) teamMap.set(team, [])
    teamMap.get(team)!.push(p)
  }

  for (const [team, teamPicks] of teamMap) {
    if (teamPicks.length < 2) continue
    // Only create edges between picks on different dates (same-game is separate)
    for (let i = 0; i < teamPicks.length; i++) {
      for (let j = i + 1; j < teamPicks.length; j++) {
        if (teamPicks[i].game_date === teamPicks[j].game_date) continue
        edges.push({
          source: teamPicks[i].id,
          target: teamPicks[j].id,
          type: 'same-team',
          label: `Same team (${team})`,
          strength: 0.5,
        })
      }
    }
  }

  return edges
}

/**
 * Detect same-day-sport correlations: multiple picks in same sport on same day.
 */
function detectSameDaySport(picks: PickNode[]): PickEdge[] {
  const edges: PickEdge[] = []
  const dayMap = new Map<string, PickNode[]>()

  for (const p of picks) {
    if (!p.game_date || !p.sport) continue
    const key = `${p.game_date}-${p.sport}`
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key)!.push(p)
  }

  for (const [, group] of dayMap) {
    if (group.length < 3) continue // Only flag if 3+ picks in same sport/day
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        // Skip if already connected as same-game
        const teamI = group[i].pick_team
        const teamJ = group[j].pick_team
        if (teamI && teamJ && teamI.toLowerCase() === teamJ.toLowerCase()) continue

        edges.push({
          source: group[i].id,
          target: group[j].id,
          type: 'same-day-sport',
          label: `Same day ${group[i].sport}`,
          strength: 0.3,
        })
      }
    }
  }

  return edges
}

/**
 * Build clusters from edges using union-find.
 */
function buildClusters(nodes: PickNode[], edges: PickEdge[]): DependencyCluster[] {
  const parent = new Map<string, string>()

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x)
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
    return parent.get(x)!
  }

  function union(x: string, y: string): void {
    const px = find(x)
    const py = find(y)
    if (px !== py) parent.set(px, py)
  }

  for (const n of nodes) parent.set(n.id, n.id)
  for (const e of edges) union(e.source, e.target)

  // Group by root
  const groups = new Map<string, string[]>()
  for (const n of nodes) {
    const root = find(n.id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(n.id)
  }

  const clusters: DependencyCluster[] = []
  let id = 0

  for (const [, pickIds] of groups) {
    if (pickIds.length < 2) continue

    // Determine reason from edges
    const clusterEdges = edges.filter(
      (e) => pickIds.includes(e.source) && pickIds.includes(e.target)
    )
    const types = new Set(clusterEdges.map((e) => e.type))
    const reasons: string[] = []
    if (types.has('same-game')) reasons.push('same game')
    if (types.has('same-team')) reasons.push('same team')
    if (types.has('same-day-sport')) reasons.push('same day/sport')

    const riskLevel: DependencyCluster['riskLevel'] =
      pickIds.length >= 5 || types.has('same-game') ? 'high' :
      pickIds.length >= 3 ? 'medium' : 'low'

    clusters.push({
      id: id++,
      pickIds,
      reason: reasons.join(', ') || 'correlated',
      riskLevel,
    })
  }

  return clusters.sort((a, b) => b.pickIds.length - a.pickIds.length)
}

/**
 * Build the full dependency graph.
 */
export function buildDependencyGraph(picks: PickNode[]): DependencyGraph {
  if (picks.length < 2) {
    return {
      nodes: picks,
      edges: [],
      clusters: [],
      totalEdges: 0,
      correlatedRate: 0,
      maxClusterSize: 0,
      riskSummary: 'Need at least 2 picks to analyze dependencies.',
    }
  }

  const edges = [
    ...detectSameGame(picks),
    ...detectSameTeam(picks),
    ...detectSameDaySport(picks),
  ]

  // Deduplicate edges (same source-target pair)
  const edgeKeys = new Set<string>()
  const uniqueEdges = edges.filter((e) => {
    const key = [e.source, e.target].sort().join('|')
    if (edgeKeys.has(key)) return false
    edgeKeys.add(key)
    return true
  })

  const clusters = buildClusters(picks, uniqueEdges)

  const correlatedPicks = new Set<string>()
  for (const e of uniqueEdges) {
    correlatedPicks.add(e.source)
    correlatedPicks.add(e.target)
  }

  const correlatedRate = (correlatedPicks.size / picks.length) * 100
  const maxClusterSize = clusters.length > 0 ? clusters[0].pickIds.length : 0

  let riskSummary = ''
  const highRisk = clusters.filter((c) => c.riskLevel === 'high')
  if (highRisk.length > 0) {
    riskSummary = `${highRisk.length} high-risk cluster(s) detected. ${correlatedRate.toFixed(0)}% of picks are correlated. Consider diversifying across games and teams.`
  } else if (clusters.length > 0) {
    riskSummary = `${clusters.length} correlation cluster(s) found. ${correlatedRate.toFixed(0)}% of picks share dependencies. Risk is manageable.`
  } else {
    riskSummary = 'No pick correlations detected. Good portfolio diversification.'
  }

  return {
    nodes: picks,
    edges: uniqueEdges,
    clusters,
    totalEdges: uniqueEdges.length,
    correlatedRate,
    maxClusterSize,
    riskSummary,
  }
}
