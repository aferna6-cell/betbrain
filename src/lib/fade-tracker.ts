/**
 * Fade Tracker — Track performance of contrarian plays vs public side.
 *
 * Analyzes picks where the user bet against the estimated public consensus.
 * Tracks fade win rate, ROI, and whether fading the public is profitable.
 *
 * Pure functions — no side effects, no API calls.
 */

export interface FadeRecord {
  id: string
  game_date: string
  sport: string
  pick_team: string | null
  odds: number
  units: number
  outcome: 'win' | 'loss' | 'push'
  profit: number
  /** Was this a fade (bet against the public)? */
  isFade: boolean
  /** Estimated public side percentage */
  publicPct: number | null
  /** Fade strength: how far against public (0-100) */
  fadeStrength: number
}

export interface FadeTrackerReport {
  totalFades: number
  totalNonFades: number
  /** Fade performance */
  fadeWins: number
  fadeLosses: number
  fadeWinRate: number | null
  fadeROI: number
  fadeProfitUnits: number
  /** Non-fade performance */
  nonFadeWins: number
  nonFadeLosses: number
  nonFadeWinRate: number | null
  nonFadeROI: number
  nonFadeProfitUnits: number
  /** Comparison */
  fadeEdge: number // Fade ROI - NonFade ROI
  shouldFade: boolean
  /** By sport */
  bySport: FadeSportBreakdown[]
  /** Insight */
  insight: string
}

export interface FadeSportBreakdown {
  sport: string
  fadeWinRate: number | null
  fadeROI: number
  nonFadeWinRate: number | null
  nonFadeROI: number
  fadeCount: number
  nonFadeCount: number
}

export interface PickForFadeTracker {
  id: string
  game_date: string
  sport: string
  pick_team: string | null
  odds: number
  units: number
  outcome: string | null
  profit: number | null
}

/**
 * Determine if a pick is a "fade" (contrarian play).
 *
 * A pick is considered a fade if:
 * - It's on the underdog (positive odds)
 * - Or the odds suggest the team is not the public favorite
 *
 * This is a simplified heuristic. With real public betting data, this
 * would use actual public % instead.
 */
export function isFadePick(pick: PickForFadeTracker): { isFade: boolean; publicPct: number | null; fadeStrength: number } {
  // Heuristic: underdog picks (positive odds) are more contrarian
  // Heavy favorites (-300+) are "public" picks
  const odds = pick.odds

  if (odds >= 200) {
    // Big underdog — strong fade
    return { isFade: true, publicPct: estimatePublicPct(odds), fadeStrength: Math.min(100, Math.round((odds - 100) / 5)) }
  }
  if (odds >= 100) {
    // Slight underdog — moderate fade
    return { isFade: true, publicPct: estimatePublicPct(odds), fadeStrength: Math.round((odds - 100) / 2) }
  }
  if (odds >= -130) {
    // Near pick-em — weak fade or neutral
    return { isFade: false, publicPct: estimatePublicPct(odds), fadeStrength: 0 }
  }
  if (odds >= -200) {
    // Moderate favorite — public side
    return { isFade: false, publicPct: estimatePublicPct(odds), fadeStrength: 0 }
  }
  // Heavy favorite — very public
  return { isFade: false, publicPct: estimatePublicPct(odds), fadeStrength: 0 }
}

/**
 * Estimate public betting percentage from odds.
 * This is a rough heuristic — real data would be better.
 */
function estimatePublicPct(odds: number): number {
  // Convert to implied probability
  let impliedProb: number
  if (odds > 0) {
    impliedProb = 100 / (odds + 100)
  } else {
    impliedProb = Math.abs(odds) / (Math.abs(odds) + 100)
  }

  // Public tends to overbet favorites by ~10-15%
  // So the "public %" is roughly implied + favorite bias
  const publicBias = odds < 0 ? 0.12 : -0.08
  return Math.round(Math.min(95, Math.max(5, (impliedProb + publicBias) * 100)))
}

/**
 * Build a fade tracker report from pick history.
 */
export function buildFadeTrackerReport(
  picks: PickForFadeTracker[]
): FadeTrackerReport {
  const resolved = picks.filter(
    (p) => p.outcome === 'win' || p.outcome === 'loss'
  )

  const records: FadeRecord[] = resolved.map((pick) => {
    const { isFade, publicPct, fadeStrength } = isFadePick(pick)
    return {
      id: pick.id,
      game_date: pick.game_date,
      sport: pick.sport,
      pick_team: pick.pick_team,
      odds: pick.odds,
      units: pick.units,
      outcome: pick.outcome as 'win' | 'loss' | 'push',
      profit: pick.profit ?? 0,
      isFade,
      publicPct,
      fadeStrength,
    }
  })

  const fades = records.filter((r) => r.isFade)
  const nonFades = records.filter((r) => !r.isFade)

  const fadeWins = fades.filter((r) => r.outcome === 'win').length
  const fadeLosses = fades.filter((r) => r.outcome === 'loss').length
  const fadeProfit = fades.reduce((sum, r) => sum + r.profit, 0)
  const fadeUnits = fades.reduce((sum, r) => sum + r.units, 0)
  const fadeWinRate = fades.length > 0 ? Math.round((fadeWins / fades.length) * 1000) / 10 : null
  const fadeROI = fadeUnits > 0 ? Math.round((fadeProfit / fadeUnits) * 10000) / 100 : 0

  const nonFadeWins = nonFades.filter((r) => r.outcome === 'win').length
  const nonFadeLosses = nonFades.filter((r) => r.outcome === 'loss').length
  const nonFadeProfit = nonFades.reduce((sum, r) => sum + r.profit, 0)
  const nonFadeUnits = nonFades.reduce((sum, r) => sum + r.units, 0)
  const nonFadeWinRate = nonFades.length > 0 ? Math.round((nonFadeWins / nonFades.length) * 1000) / 10 : null
  const nonFadeROI = nonFadeUnits > 0 ? Math.round((nonFadeProfit / nonFadeUnits) * 10000) / 100 : 0

  const fadeEdge = Math.round((fadeROI - nonFadeROI) * 100) / 100
  const shouldFade = fadeEdge > 5 && fades.length >= 5

  // By sport
  const sports = [...new Set(records.map((r) => r.sport))]
  const bySport: FadeSportBreakdown[] = sports.map((sport) => {
    const sportFades = fades.filter((r) => r.sport === sport)
    const sportNonFades = nonFades.filter((r) => r.sport === sport)
    const sf = sportFades.length
    const sfWins = sportFades.filter((r) => r.outcome === 'win').length
    const sfProfit = sportFades.reduce((s, r) => s + r.profit, 0)
    const sfUnits = sportFades.reduce((s, r) => s + r.units, 0)
    const snf = sportNonFades.length
    const snfWins = sportNonFades.filter((r) => r.outcome === 'win').length
    const snfProfit = sportNonFades.reduce((s, r) => s + r.profit, 0)
    const snfUnits = sportNonFades.reduce((s, r) => s + r.units, 0)

    return {
      sport,
      fadeWinRate: sf > 0 ? Math.round((sfWins / sf) * 1000) / 10 : null,
      fadeROI: sfUnits > 0 ? Math.round((sfProfit / sfUnits) * 10000) / 100 : 0,
      nonFadeWinRate: snf > 0 ? Math.round((snfWins / snf) * 1000) / 10 : null,
      nonFadeROI: snfUnits > 0 ? Math.round((snfProfit / snfUnits) * 10000) / 100 : 0,
      fadeCount: sf,
      nonFadeCount: snf,
    }
  }).sort((a, b) => b.fadeCount - a.fadeCount)

  const insight = generateFadeInsight(fades.length, nonFades.length, fadeROI, nonFadeROI, fadeWinRate, shouldFade)

  return {
    totalFades: fades.length,
    totalNonFades: nonFades.length,
    fadeWins,
    fadeLosses,
    fadeWinRate,
    fadeROI,
    fadeProfitUnits: Math.round(fadeProfit * 100) / 100,
    nonFadeWins,
    nonFadeLosses,
    nonFadeWinRate,
    nonFadeROI,
    nonFadeProfitUnits: Math.round(nonFadeProfit * 100) / 100,
    fadeEdge,
    shouldFade,
    bySport,
    insight,
  }
}

function generateFadeInsight(
  fadeCount: number,
  nonFadeCount: number,
  fadeROI: number,
  nonFadeROI: number,
  fadeWinRate: number | null,
  shouldFade: boolean
): string {
  const total = fadeCount + nonFadeCount
  if (total === 0) return 'No resolved picks yet.'
  if (total < 10) return 'Need at least 10 resolved picks for meaningful fade analysis.'

  if (fadeCount === 0) return 'No contrarian plays detected. Consider exploring underdog value.'

  const fadePct = Math.round((fadeCount / total) * 100)

  if (shouldFade) {
    return `Fading the public is profitable: ${fadeROI.toFixed(1)}% ROI vs ${nonFadeROI.toFixed(1)}% on public-side bets. ${fadePct}% of your picks are contrarian.`
  }

  if (fadeROI > nonFadeROI) {
    return `Fades outperform (${fadeROI.toFixed(1)}% vs ${nonFadeROI.toFixed(1)}%) but need more sample size. ${fadePct}% of picks are contrarian.`
  }

  return `Public-side bets outperform fades (${nonFadeROI.toFixed(1)}% vs ${fadeROI.toFixed(1)}% ROI). ${fadePct}% of picks are contrarian.`
}
