/**
 * Parlay correlation detection.
 * Flags correlated legs BEFORE sending to AI for analysis.
 * Pure functions — no API calls.
 */

export interface ParlayLegForCorrelation {
  description: string
  sport: string
  gameId?: string | null
  team?: string | null
  market?: string | null // moneyline, spread, over, under, prop
}

export interface CorrelationWarning {
  type: 'same-game' | 'same-team' | 'related-props' | 'opposing-sides'
  severity: 'high' | 'medium' | 'low'
  message: string
  legIndices: number[]
}

/**
 * Detect correlation between parlay legs.
 * Returns warnings sorted by severity (high first).
 */
export function detectCorrelations(
  legs: ParlayLegForCorrelation[]
): CorrelationWarning[] {
  const warnings: CorrelationWarning[] = []

  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const a = legs[i]
      const b = legs[j]

      const sameGame = !!(a.gameId && b.gameId && a.gameId === b.gameId)

      // Same game correlation (highest risk)
      if (sameGame) {
        warnings.push({
          type: 'same-game',
          severity: 'high',
          message: `Legs ${i + 1} and ${j + 1} are from the same game — highly correlated. If one hits, the other is more/less likely too. Books price same-game parlays with extra vig.`,
          legIndices: [i, j],
        })
      }

      // Same team in different markets
      if (a.team && b.team && normalizeTeam(a.team) === normalizeTeam(b.team)) {
        if (a.gameId !== b.gameId) {
          // Different game, same team — low risk
          warnings.push({
            type: 'same-team',
            severity: 'low',
            message: `Legs ${i + 1} and ${j + 1} involve the same team (${a.team}) in different games.`,
            legIndices: [i, j],
          })
        }
      }

      // Opposing sides of same market
      if (sameGame && a.market && b.market) {
        if (
          (a.market === 'over' && b.market === 'under') ||
          (a.market === 'under' && b.market === 'over')
        ) {
          warnings.push({
            type: 'opposing-sides',
            severity: 'high',
            message: `Legs ${i + 1} and ${j + 1} are opposing sides of the same total — only one can hit.`,
            legIndices: [i, j],
          })
        }
      }

      // Related player props (same game + same sport)
      if (sameGame && a.market === 'prop' && b.market === 'prop') {
        warnings.push({
          type: 'related-props',
          severity: 'medium',
          message: `Legs ${i + 1} and ${j + 1} are player props from the same game — likely correlated. Game flow affects all player stats in the same direction.`,
          legIndices: [i, j],
        })
      }
    }
  }

  // Deduplicate by type + legIndices
  const seen = new Set<string>()
  const unique = warnings.filter((w) => {
    const key = `${w.type}-${w.legIndices.sort().join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by severity
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  return unique.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )
}

/**
 * Calculate a correlation risk score (0-100).
 * Higher = more correlated = worse parlay construction.
 */
export function correlationScore(warnings: CorrelationWarning[]): number {
  if (warnings.length === 0) return 0

  let score = 0
  for (const w of warnings) {
    if (w.severity === 'high') score += 30
    else if (w.severity === 'medium') score += 15
    else score += 5
  }

  return Math.min(100, score)
}

function normalizeTeam(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}
