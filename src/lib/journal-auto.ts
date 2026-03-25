/**
 * Smart Pick Journal Integration — Auto-fill journal entries from pick data.
 *
 * Instead of manually writing journal entries, this module generates
 * pre-filled entries from:
 *   1. Today's pick outcomes (wins, losses, profit/loss)
 *   2. Pregame checklist completion data
 *   3. Daily review ratings (if completed)
 *   4. Detected patterns (streaks, tilt indicators, notable outcomes)
 *
 * The user can still edit the auto-generated entry before saving.
 * Pure functions — no side effects.
 */

import type { JournalEntry, JournalMood } from './journal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PickSummary {
  gameId: string
  sport: string
  pickType: string
  pickTeam: string | null
  odds: number
  units: number
  outcome: 'win' | 'loss' | 'push' | 'pending' | null
  profit: number | null
  notes: string | null
  gameDate: string
}

export interface ChecklistSummary {
  /** Process score from pregame checklist (0-100) */
  processScore: number
  /** Number of items checked vs total */
  checkedCount: number
  totalCount: number
  /** Which required items were skipped */
  skippedRequired: string[]
}

export interface ReviewSummary {
  processGrade: string
  discipline: number
  bankrollDiscipline: number
  researchQuality: number
  chased: boolean
  lesson: string
}

export interface AutoJournalInput {
  date: string // YYYY-MM-DD
  picks: PickSummary[]
  checklist?: ChecklistSummary | null
  review?: ReviewSummary | null
  /** Current bankroll balance */
  bankroll?: number | null
}

export interface AutoJournalDraft {
  date: string
  mood: JournalMood
  bankroll: number | null
  title: string
  notes: string
  lessons: string[]
  tags: string[]
}

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

/**
 * Generate an auto-filled journal entry draft from today's pick data.
 * The user can review and edit before saving.
 */
export function generateJournalDraft(input: AutoJournalInput): AutoJournalDraft {
  const { date, picks, checklist, review, bankroll } = input

  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const wins = resolved.filter((p) => p.outcome === 'win')
  const losses = resolved.filter((p) => p.outcome === 'loss')
  const pushes = resolved.filter((p) => p.outcome === 'push')
  const pending = picks.filter((p) => !p.outcome || p.outcome === 'pending')

  const totalProfit = resolved.reduce((sum, p) => sum + (p.profit ?? 0), 0)
  const totalUnitsRisked = resolved.reduce((sum, p) => sum + p.units, 0)

  // Determine mood
  const mood = inferMood(wins.length, losses.length, totalProfit, review)

  // Generate title
  const title = generateTitle(wins.length, losses.length, pushes.length, totalProfit, date)

  // Generate notes
  const notes = generateNotes(
    wins, losses, pushes, pending,
    totalProfit, totalUnitsRisked,
    checklist, review
  )

  // Extract lessons
  const lessons = extractLessons(wins, losses, checklist, review, totalProfit)

  // Auto-tag based on data
  const tags = generateTags(picks, wins.length, losses.length, totalProfit, review)

  return {
    date,
    mood,
    bankroll: bankroll ?? null,
    title,
    notes,
    lessons,
    tags,
  }
}

// ---------------------------------------------------------------------------
// Mood inference
// ---------------------------------------------------------------------------

/**
 * Infer mood from pick outcomes and review data.
 */
export function inferMood(
  wins: number,
  losses: number,
  profit: number,
  review?: ReviewSummary | null
): JournalMood {
  // If review is available, weight it heavily (it's the user's own assessment)
  if (review) {
    if (review.chased) return 'bad'
    if (review.discipline >= 4 && profit > 0) return 'great'
    if (review.discipline >= 4) return 'good'
    if (review.discipline <= 2) return 'bad'
  }

  const total = wins + losses
  if (total === 0) return 'neutral'

  const winRate = wins / total

  if (profit > 0 && winRate >= 0.7) return 'great'
  if (profit > 0) return 'good'
  if (profit === 0) return 'neutral'
  if (winRate <= 0.2 && losses >= 3) return 'terrible'
  return 'bad'
}

// ---------------------------------------------------------------------------
// Title generation
// ---------------------------------------------------------------------------

function generateTitle(
  wins: number,
  losses: number,
  pushes: number,
  profit: number,
  date: string
): string {
  const total = wins + losses + pushes
  if (total === 0) return `Rest day — ${formatShortDate(date)}`

  const record = `${wins}-${losses}${pushes > 0 ? `-${pushes}` : ''}`
  const profitStr = profit >= 0 ? `+${profit.toFixed(1)}u` : `${profit.toFixed(1)}u`

  if (profit > 0 && wins > losses) return `Solid day: ${record} (${profitStr})`
  if (profit > 0) return `Green day: ${record} (${profitStr})`
  if (profit === 0) return `Break-even: ${record}`
  if (losses >= 3 && wins === 0) return `Rough day: ${record} (${profitStr})`
  return `Down day: ${record} (${profitStr})`
}

// ---------------------------------------------------------------------------
// Notes generation
// ---------------------------------------------------------------------------

function generateNotes(
  wins: PickSummary[],
  losses: PickSummary[],
  pushes: PickSummary[],
  pending: PickSummary[],
  totalProfit: number,
  totalUnitsRisked: number,
  checklist?: ChecklistSummary | null,
  review?: ReviewSummary | null
): string {
  const lines: string[] = []

  // Record summary
  const resolved = wins.length + losses.length + pushes.length
  if (resolved > 0) {
    lines.push(`## Record: ${wins.length}W-${losses.length}L${pushes.length > 0 ? `-${pushes.length}P` : ''}`)
    lines.push(`P/L: ${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} units`)
    if (totalUnitsRisked > 0) {
      const roi = (totalProfit / totalUnitsRisked) * 100
      lines.push(`ROI: ${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`)
    }
    lines.push('')
  }

  // Win details
  if (wins.length > 0) {
    lines.push('### Wins')
    for (const w of wins) {
      const desc = formatPickLine(w)
      lines.push(`- ${desc}`)
    }
    lines.push('')
  }

  // Loss details
  if (losses.length > 0) {
    lines.push('### Losses')
    for (const l of losses) {
      const desc = formatPickLine(l)
      lines.push(`- ${desc}`)
    }
    lines.push('')
  }

  // Pending
  if (pending.length > 0) {
    lines.push(`### Pending: ${pending.length} pick${pending.length > 1 ? 's' : ''} still open`)
    lines.push('')
  }

  // Process quality
  if (checklist) {
    lines.push(`### Process`)
    lines.push(`Checklist: ${checklist.checkedCount}/${checklist.totalCount} (score: ${checklist.processScore}/100)`)
    if (checklist.skippedRequired.length > 0) {
      lines.push(`Skipped required: ${checklist.skippedRequired.join(', ')}`)
    }
    lines.push('')
  }

  // Daily review integration
  if (review) {
    lines.push(`### Self-Assessment`)
    lines.push(`Grade: ${review.processGrade} | Discipline: ${review.discipline}/5 | Research: ${review.researchQuality}/5`)
    if (review.chased) {
      lines.push('**Warning: Chased losses today.**')
    }
    if (review.lesson) {
      lines.push(`Key lesson: ${review.lesson}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ---------------------------------------------------------------------------
// Lessons extraction
// ---------------------------------------------------------------------------

/**
 * Extract actionable lessons from today's data.
 */
export function extractLessons(
  wins: PickSummary[],
  losses: PickSummary[],
  checklist?: ChecklistSummary | null,
  review?: ReviewSummary | null,
  totalProfit?: number
): string[] {
  const lessons: string[] = []

  // Lesson from review
  if (review?.lesson) {
    lessons.push(review.lesson)
  }

  // Chase detection
  if (review?.chased) {
    lessons.push('Chased losses today — need to stick to the system')
  }

  // Process quality
  if (checklist && checklist.processScore < 60) {
    lessons.push('Low process score — rushed picks without completing the checklist')
  }
  if (checklist && checklist.processScore >= 90 && (totalProfit ?? 0) < 0) {
    lessons.push('Good process but bad results — stay the course, variance will even out')
  }

  // Big underdog wins
  const bigWins = wins.filter((w) => w.odds >= 200)
  if (bigWins.length > 0) {
    lessons.push(`${bigWins.length} underdog win${bigWins.length > 1 ? 's' : ''} — contrarian value pays off`)
  }

  // Bad beats (losses at high odds on favorites)
  const badBeats = losses.filter((l) => l.odds <= -200)
  if (badBeats.length > 0) {
    lessons.push(`${badBeats.length} heavy favorite loss${badBeats.length > 1 ? 'es' : ''} — re-evaluate chalk exposure`)
  }

  // Profitable with losing record
  if ((totalProfit ?? 0) > 0 && losses.length > wins.length) {
    lessons.push('Made money despite losing record — good unit sizing/line selection')
  }

  // Losing with winning record
  if ((totalProfit ?? 0) < 0 && wins.length > losses.length) {
    lessons.push('Lost money despite winning record — check unit sizing on losses vs wins')
  }

  // Volume concerns
  if (wins.length + losses.length >= 8) {
    lessons.push('High volume day (8+ picks) — risk of over-betting and reduced edge')
  }

  return lessons.slice(0, 5) // Cap at 5 lessons to avoid overwhelm
}

// ---------------------------------------------------------------------------
// Tag generation
// ---------------------------------------------------------------------------

function generateTags(
  picks: PickSummary[],
  wins: number,
  losses: number,
  profit: number,
  review?: ReviewSummary | null
): string[] {
  const tags = new Set<string>()

  // Sport tags
  const sports = new Set(picks.map((p) => p.sport.toLowerCase()))
  for (const s of sports) {
    tags.add(s)
  }

  // Pick type tags
  const hasParlay = picks.some((p) => p.pickType === 'parlay')
  const hasProps = picks.some((p) => p.pickType === 'prop')
  if (hasParlay) tags.add('parlay')
  if (hasProps) tags.add('props')

  // Outcome tags
  if (profit > 0) tags.add('green day')
  if (profit < 0) tags.add('red day')
  if (wins >= 3 && losses === 0) tags.add('perfect day')
  if (losses >= 3 && wins === 0) tags.add('sweep loss')

  // Process tags
  if (review?.chased) tags.add('tilt')
  if (review?.discipline && review.discipline >= 4) tags.add('disciplined')

  // Volume
  if (picks.length === 0) tags.add('rest day')
  if (picks.length >= 6) tags.add('high volume')

  return Array.from(tags)
}

// ---------------------------------------------------------------------------
// Streak detection
// ---------------------------------------------------------------------------

/**
 * Detect notable streaks in a series of pick outcomes.
 */
export function detectStreaks(
  picks: PickSummary[]
): { currentWinStreak: number; currentLossStreak: number; longestWinStreak: number; longestLossStreak: number } {
  let currentWin = 0
  let currentLoss = 0
  let longestWin = 0
  let longestLoss = 0
  let tempWin = 0
  let tempLoss = 0

  // Sort by game date
  const sorted = [...picks]
    .filter((p) => p.outcome === 'win' || p.outcome === 'loss')
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate))

  for (const p of sorted) {
    if (p.outcome === 'win') {
      tempWin++
      tempLoss = 0
      longestWin = Math.max(longestWin, tempWin)
    } else {
      tempLoss++
      tempWin = 0
      longestLoss = Math.max(longestLoss, tempLoss)
    }
  }

  currentWin = tempWin
  currentLoss = tempLoss

  return { currentWinStreak: currentWin, currentLossStreak: currentLoss, longestWinStreak: longestWin, longestLossStreak: longestLoss }
}

/**
 * Generate a weekly summary from multiple days of auto-journal data.
 */
export function summarizeWeek(
  dailyDrafts: AutoJournalDraft[]
): { totalProfit: string; bestDay: string | null; worstDay: string | null; avgMood: JournalMood; totalLessons: number } {
  if (dailyDrafts.length === 0) {
    return { totalProfit: '0.0', bestDay: null, worstDay: null, avgMood: 'neutral', totalLessons: 0 }
  }

  // Parse profit from title lines (e.g., "Solid day: 3-1 (+2.5u)")
  let totalProfitValue = 0
  let bestProfit = -Infinity
  let worstProfit = Infinity
  let bestDay: string | null = null
  let worstDay: string | null = null

  for (const draft of dailyDrafts) {
    const profitMatch = draft.title.match(/([+-][\d.]+)u/)
    const profitVal = profitMatch ? parseFloat(profitMatch[1]) : 0
    totalProfitValue += profitVal

    if (profitVal > bestProfit) {
      bestProfit = profitVal
      bestDay = draft.date
    }
    if (profitVal < worstProfit) {
      worstProfit = profitVal
      worstDay = draft.date
    }
  }

  // Average mood
  const moodScores: Record<JournalMood, number> = { great: 5, good: 4, neutral: 3, bad: 2, terrible: 1 }
  const scoreMoods: JournalMood[] = ['terrible', 'terrible', 'bad', 'neutral', 'good', 'great']
  const avgScore = dailyDrafts.reduce((sum, d) => sum + moodScores[d.mood], 0) / dailyDrafts.length
  const avgMood = scoreMoods[Math.round(avgScore)] ?? 'neutral'

  const totalLessons = dailyDrafts.reduce((sum, d) => sum + d.lessons.length, 0)

  return {
    totalProfit: totalProfitValue >= 0 ? `+${totalProfitValue.toFixed(1)}` : totalProfitValue.toFixed(1),
    bestDay: bestProfit > -Infinity ? bestDay : null,
    worstDay: worstProfit < Infinity ? worstDay : null,
    avgMood,
    totalLessons,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPickLine(pick: PickSummary): string {
  const team = pick.pickTeam ?? 'Unknown'
  const sport = pick.sport.toUpperCase()
  const odds = pick.odds >= 0 ? `+${pick.odds}` : `${pick.odds}`
  const profit = pick.profit !== null
    ? (pick.profit >= 0 ? `+${pick.profit.toFixed(1)}u` : `${pick.profit.toFixed(1)}u`)
    : ''
  return `${sport}: ${team} (${pick.pickType}) ${odds} ${pick.units}u ${profit}`.trim()
}

function formatShortDate(date: string): string {
  const parts = date.split('-')
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    return `${month}/${day}`
  }
  return date
}
