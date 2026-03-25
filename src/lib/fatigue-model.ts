/**
 * Back-to-Back Fatigue Model
 *
 * Quantifies the fatigue impact for NBA and NHL teams in B2B situations.
 * Goes beyond simple detection to model severity based on:
 *
 * - Rest differential (opponent rest days vs team rest)
 * - Home/away context (road B2B worse than home B2B)
 * - Time zone crossing penalty
 * - Historical B2B performance by sport
 * - Cumulative schedule density (games in last N days)
 *
 * Output: fatigue score 0-100, fatigue rating, ATS impact estimate,
 * and a recommendation for how to factor fatigue into analysis.
 *
 * Pure functions, no side effects.
 * For informational purposes only. Not financial advice.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleEntry {
  gameId: string
  team: string
  opponent: string
  date: string        // ISO date YYYY-MM-DD
  isHome: boolean
  sport: 'nba' | 'nhl'
  /** Optional: city or timezone for travel factor */
  location?: string
}

export type FatigueRating = 'severe' | 'high' | 'moderate' | 'mild' | 'none'

export interface FatigueAssessment {
  /** Team being assessed */
  team: string
  /** Opponent */
  opponent: string
  /** Game being analyzed */
  gameId: string
  sport: 'nba' | 'nhl'
  /** Is this team on a B2B? */
  isBackToBack: boolean
  /** Overall fatigue score 0-100 (100 = maximum fatigue) */
  fatigueScore: number
  /** Human-readable rating */
  rating: FatigueRating
  /** Individual factor scores */
  factors: {
    /** Rest differential factor 0-30 */
    restDifferential: number
    /** Home/away context 0-20 */
    venueContext: number
    /** Schedule density (games in last 7 days) 0-20 */
    scheduleDensity: number
    /** Travel factor 0-15 */
    travelPenalty: number
    /** Back-to-back specific penalty 0-15 */
    b2bPenalty: number
  }
  /** Detailed breakdown explanations */
  breakdown: string[]
  /** Rest days for this team */
  teamRestDays: number
  /** Rest days for opponent */
  opponentRestDays: number
  /** Games played in last 7 days */
  gamesInLast7: number
  /** Estimated ATS impact in points */
  atsImpact: number
  /** Recommendation for this game */
  recommendation: string
  /** Historical win rate on B2B (sport-specific) */
  historicalB2BWinRate: number
  /** Disclaimer */
  disclaimer: string
}

export interface FatigueComparison {
  /** Home team assessment */
  home: FatigueAssessment
  /** Away team assessment */
  away: FatigueAssessment
  /** Which team has the fatigue edge (less fatigued) */
  fatigueEdge: 'home' | 'away' | 'even'
  /** Point differential from fatigue */
  fatigueDifferential: number
  /** Overall analysis */
  summary: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCLAIMER = 'For informational purposes only. Not financial advice. Historical trends do not guarantee future results.'

/** Historical B2B performance data (approximate averages from research) */
const SPORT_B2B_STATS: Record<'nba' | 'nhl', {
  avgWinRate: number          // B2B team win rate
  avgATSImpact: number        // ATS point impact
  homeB2BWinRate: number      // Home B2B win rate
  awayB2BWinRate: number      // Road B2B win rate
}> = {
  nba: {
    avgWinRate: 0.445,          // ~44.5% win rate on B2Bs
    avgATSImpact: -1.5,         // ~1.5 pts worse ATS
    homeB2BWinRate: 0.51,       // Home B2B still around 50/50
    awayB2BWinRate: 0.38,       // Road B2B much worse
  },
  nhl: {
    avgWinRate: 0.46,           // ~46% win rate on B2Bs
    avgATSImpact: -0.3,         // Smaller impact due to puck line
    homeB2BWinRate: 0.52,
    awayB2BWinRate: 0.40,
  },
}

// US city timezone offsets (simplified for travel penalty calculation)
const TIMEZONE_OFFSETS: Record<string, number> = {
  // Eastern
  'new york': -5, 'boston': -5, 'philadelphia': -5, 'miami': -5,
  'orlando': -5, 'atlanta': -5, 'charlotte': -5, 'washington': -5,
  'cleveland': -5, 'detroit': -5, 'indiana': -5, 'toronto': -5,
  'brooklyn': -5, 'buffalo': -5, 'pittsburgh': -5, 'tampa bay': -5,
  'carolina': -5, 'columbus': -5, 'florida': -5, 'ottawa': -5,
  'montreal': -5, 'new jersey': -5,
  // Central
  'chicago': -6, 'milwaukee': -6, 'minnesota': -6, 'memphis': -6,
  'new orleans': -6, 'houston': -6, 'dallas': -6, 'san antonio': -6,
  'oklahoma city': -6, 'st. louis': -6, 'nashville': -6, 'winnipeg': -6,
  // Mountain
  'denver': -7, 'utah': -7, 'arizona': -7, 'phoenix': -7,
  'colorado': -7, 'calgary': -7, 'edmonton': -7,
  // Pacific
  'los angeles': -8, 'golden state': -8, 'sacramento': -8,
  'portland': -8, 'seattle': -8, 'vancouver': -8, 'san jose': -8,
  'anaheim': -8, 'la clippers': -8, 'la lakers': -8, 'vegas': -8,
  'las vegas': -8,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1)
  const date2 = new Date(d2)
  return Math.round(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
}

function getTimezoneOffset(location: string): number {
  const lower = location.toLowerCase()
  for (const [city, offset] of Object.entries(TIMEZONE_OFFSETS)) {
    if (lower.includes(city)) return offset
  }
  return -6 // default to central
}

function getTimezoneCrossings(from: string | undefined, to: string | undefined): number {
  if (!from || !to) return 0
  const fromTZ = getTimezoneOffset(from)
  const toTZ = getTimezoneOffset(to)
  return Math.abs(fromTZ - toTZ)
}

function getRating(score: number): FatigueRating {
  if (score >= 75) return 'severe'
  if (score >= 55) return 'high'
  if (score >= 35) return 'moderate'
  if (score >= 15) return 'mild'
  return 'none'
}

// ---------------------------------------------------------------------------
// Core assessment
// ---------------------------------------------------------------------------

/**
 * Assess fatigue for a specific team heading into a game.
 *
 * @param team Schedule entries for this team (recent games, sorted by date ascending)
 * @param targetGameId The game we're assessing fatigue for
 * @param targetDate The date of the target game
 * @param isHome Whether the team is home for the target game
 * @param opponentSchedule Opponent's recent schedule entries
 * @param sport 'nba' or 'nhl'
 * @param location Optional location/city for travel penalty
 */
export function assessFatigue(
  teamSchedule: ScheduleEntry[],
  targetGameId: string,
  targetDate: string,
  isHome: boolean,
  opponentSchedule: ScheduleEntry[],
  sport: 'nba' | 'nhl',
  location?: string
): FatigueAssessment {
  const team = teamSchedule.length > 0 ? teamSchedule[0].team : 'Unknown'
  const opponent = opponentSchedule.length > 0 ? opponentSchedule[0].team : 'Unknown'

  // Get games before the target date
  const priorGames = teamSchedule
    .filter(g => g.date < targetDate && g.gameId !== targetGameId)
    .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first

  const oppPriorGames = opponentSchedule
    .filter(g => g.date < targetDate && g.gameId !== targetGameId)
    .sort((a, b) => b.date.localeCompare(a.date))

  // Rest days
  const lastGame = priorGames[0]
  const teamRestDays = lastGame ? daysBetween(lastGame.date, targetDate) : 3
  const oppLastGame = oppPriorGames[0]
  const opponentRestDays = oppLastGame ? daysBetween(oppLastGame.date, targetDate) : 3

  const isBackToBack = teamRestDays <= 1

  // Games in last 7 days
  const sevenDaysAgo = new Date(targetDate)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)
  const gamesInLast7 = priorGames.filter(g => g.date >= sevenDaysAgoStr).length

  // Factor 1: Rest differential (0-30)
  const restDiff = opponentRestDays - teamRestDays
  let restDifferential = 0
  if (restDiff > 0) {
    restDifferential = Math.min(restDiff * 10, 30)
  }

  // Factor 2: Venue context (0-20)
  let venueContext = 0
  if (isBackToBack && !isHome) {
    venueContext = 20 // Road B2B is worst scenario
  } else if (isBackToBack && isHome) {
    venueContext = 8 // Home B2B is manageable
  } else if (!isHome && teamRestDays <= 2) {
    venueContext = 5 // Short rest on road
  }

  // Factor 3: Schedule density (0-20)
  let scheduleDensity = 0
  if (gamesInLast7 >= 4) {
    scheduleDensity = 20
  } else if (gamesInLast7 >= 3) {
    scheduleDensity = 12
  } else if (gamesInLast7 >= 2) {
    scheduleDensity = 5
  }

  // Factor 4: Travel penalty (0-15)
  let travelPenalty = 0
  if (lastGame && location) {
    const tzCrossings = getTimezoneCrossings(lastGame.location, location)
    if (tzCrossings >= 3) {
      travelPenalty = 15
    } else if (tzCrossings >= 2) {
      travelPenalty = 10
    } else if (tzCrossings >= 1) {
      travelPenalty = 5
    }
  }

  // Factor 5: B2B specific penalty (0-15)
  let b2bPenalty = 0
  if (isBackToBack) {
    b2bPenalty = 15
    // Additional check: second of a B2B after overtime?
    // (We don't have OT data, but this is where it would go)
  } else if (teamRestDays === 2) {
    b2bPenalty = 3 // One day rest isn't great either
  }

  const fatigueScore = Math.min(
    restDifferential + venueContext + scheduleDensity + travelPenalty + b2bPenalty,
    100
  )
  const rating = getRating(fatigueScore)

  // Build breakdown
  const breakdown: string[] = []
  if (isBackToBack) {
    breakdown.push(`${team} on a back-to-back (${isHome ? 'home' : 'road'})`)
  }
  if (restDiff > 0) {
    breakdown.push(`Opponent has ${restDiff} more rest day${restDiff !== 1 ? 's' : ''}`)
  }
  if (gamesInLast7 >= 3) {
    breakdown.push(`${gamesInLast7} games in last 7 days (heavy schedule)`)
  }
  if (travelPenalty > 0) {
    breakdown.push('Cross-timezone travel adds fatigue')
  }
  if (breakdown.length === 0) {
    breakdown.push(`${team} is well-rested (${teamRestDays} day${teamRestDays !== 1 ? 's' : ''} rest)`)
  }

  // ATS impact
  const sportStats = SPORT_B2B_STATS[sport]
  let atsImpact = 0
  if (isBackToBack) {
    atsImpact = sportStats.avgATSImpact
    if (!isHome) {
      atsImpact *= 1.5 // Road B2B amplifies impact
    }
  } else if (restDiff >= 2) {
    atsImpact = -0.5 * restDiff
  }

  // Recommendation
  let recommendation: string
  if (rating === 'severe') {
    recommendation = `Strong fade spot for ${team}. Road B2B with heavy schedule density historically leads to poor ATS performance.`
  } else if (rating === 'high') {
    recommendation = `Fatigue is a significant factor for ${team}. Consider the opponent's rest advantage when evaluating this game.`
  } else if (rating === 'moderate') {
    recommendation = `Some fatigue concern for ${team}, but not extreme. Factor it in alongside other signals.`
  } else if (rating === 'mild') {
    recommendation = `Minor schedule disadvantage for ${team}. Unlikely to be a deciding factor on its own.`
  } else {
    recommendation = `${team} is well-rested. No fatigue concerns.`
  }

  const historicalB2BWinRate = isBackToBack
    ? (isHome ? sportStats.homeB2BWinRate : sportStats.awayB2BWinRate)
    : 0.5 // non-B2B, neutral

  return {
    team,
    opponent,
    gameId: targetGameId,
    sport,
    isBackToBack,
    fatigueScore,
    rating,
    factors: {
      restDifferential,
      venueContext,
      scheduleDensity,
      travelPenalty,
      b2bPenalty,
    },
    breakdown,
    teamRestDays,
    opponentRestDays,
    gamesInLast7,
    atsImpact: Math.round(atsImpact * 10) / 10,
    recommendation,
    historicalB2BWinRate,
    disclaimer: DISCLAIMER,
  }
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Compare fatigue between home and away teams for a game.
 */
export function compareFatigue(
  home: FatigueAssessment,
  away: FatigueAssessment
): FatigueComparison {
  const diff = away.fatigueScore - home.fatigueScore
  const fatigueEdge: 'home' | 'away' | 'even' =
    diff > 10 ? 'home' :
    diff < -10 ? 'away' :
    'even'

  const fatigueDifferential = Math.round(
    (away.atsImpact - home.atsImpact) * 10
  ) / 10

  let summary: string
  if (fatigueEdge === 'even') {
    summary = 'Both teams have similar rest/schedule profiles. Fatigue is not a differentiator.'
  } else if (fatigueEdge === 'home') {
    summary = `${home.team} has a fatigue edge — ${away.team} is more fatigued (score: ${away.fatigueScore} vs ${home.fatigueScore}). Estimated ${Math.abs(fatigueDifferential)} pt ATS advantage.`
  } else {
    summary = `${away.team} has a fatigue edge — ${home.team} is more fatigued (score: ${home.fatigueScore} vs ${away.fatigueScore}). Estimated ${Math.abs(fatigueDifferential)} pt ATS advantage.`
  }

  return {
    home,
    away,
    fatigueEdge,
    fatigueDifferential,
    summary,
  }
}

// ---------------------------------------------------------------------------
// Quick B2B check (for use without full schedule)
// ---------------------------------------------------------------------------

/**
 * Quick fatigue estimate using only rest days differential.
 * Useful when full schedule data isn't available.
 */
export function quickFatigueEstimate(
  teamRestDays: number,
  opponentRestDays: number,
  isHome: boolean,
  sport: 'nba' | 'nhl'
): { score: number; rating: FatigueRating; atsImpact: number } {
  let score = 0
  const isB2B = teamRestDays <= 1

  // Rest differential
  const restDiff = opponentRestDays - teamRestDays
  if (restDiff > 0) {
    score += Math.min(restDiff * 10, 30)
  }

  // Venue
  if (isB2B && !isHome) score += 20
  else if (isB2B && isHome) score += 8

  // B2B penalty
  if (isB2B) score += 15
  else if (teamRestDays === 2) score += 3

  score = Math.min(score, 100)

  const sportStats = SPORT_B2B_STATS[sport]
  let atsImpact = 0
  if (isB2B) {
    atsImpact = sportStats.avgATSImpact
    if (!isHome) atsImpact *= 1.5
  } else if (restDiff >= 2) {
    atsImpact = -0.5 * restDiff
  }

  return {
    score,
    rating: getRating(score),
    atsImpact: Math.round(atsImpact * 10) / 10,
  }
}
