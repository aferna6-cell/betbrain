/**
 * Daily digest generator — assembles the morning email content
 * from cached odds, Smart Signals, and significant line moves.
 *
 * Does NOT make live API calls — works entirely from cached Supabase data.
 */

import { getAllOdds } from '@/lib/sports/odds'
import { detectSmartSignals } from '@/lib/signals'
import { AI_DISCLAIMER } from '@/lib/ai/analysis'
import { americanToImpliedProbability } from '@/lib/clv'
import type { NormalizedGame } from '@/lib/sports/config'
import type { SmartSignal } from '@/lib/signals'
import type { Sport } from '@/lib/supabase/types'

export interface DigestGame {
  id: string
  sport: Sport
  homeTeam: string
  awayTeam: string
  commenceTime: string
  bestHomeOdds: number | null
  bestAwayOdds: number | null
  bookmakerCount: number
}

export interface LineMoveItem {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: Sport
  side: 'home' | 'away'
  variance: number
}

export interface WeeklyPickStats {
  wins: number
  losses: number
  pushes: number
  roi: number
  clvRate: number | null
}

export interface DigestContent {
  date: string
  totalGames: number
  gamesBySport: Record<string, DigestGame[]>
  smartSignals: {
    total: number
    strong: number
    items: Array<{
      homeTeam: string
      awayTeam: string
      sport: Sport
      strength: 'strong' | 'moderate'
      signalCount: number
      valueSide: string | null
      confidence: number | null
    }>
  }
  significantMoves: LineMoveItem[]
  weeklyPickStats: WeeklyPickStats | null
  disclaimer: string
}

function getBestOdds(game: NormalizedGame, side: 'home' | 'away'): number | null {
  let best: number | null = null
  for (const bk of game.bookmakers) {
    const price = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (price !== null && price !== undefined) {
      if (best === null || price > best) best = price
    }
  }
  return best
}

function getMoneylineVariance(
  game: NormalizedGame,
  side: 'home' | 'away'
): number {
  const prices: number[] = []
  for (const bk of game.bookmakers) {
    const price = side === 'home' ? bk.moneyline?.home : bk.moneyline?.away
    if (price !== null && price !== undefined) prices.push(price)
  }
  if (prices.length < 2) return 0
  return Math.max(...prices) - Math.min(...prices)
}

function toDigestGame(game: NormalizedGame): DigestGame {
  return {
    id: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    commenceTime: game.commenceTime,
    bestHomeOdds: getBestOdds(game, 'home'),
    bestAwayOdds: getBestOdds(game, 'away'),
    bookmakerCount: game.bookmakers.length,
  }
}

/**
 * Generates the full daily digest content from cached data.
 */
export async function generateDigest(): Promise<DigestContent> {
  const oddsMap = await getAllOdds()
  const allGames = Array.from(oddsMap.values()).flatMap((r) => r.games)
  const signals = await detectSmartSignals(allGames)

  // Group games by sport
  const gamesBySport: Record<string, DigestGame[]> = {}
  for (const game of allGames) {
    const key = game.sport
    if (!gamesBySport[key]) gamesBySport[key] = []
    gamesBySport[key].push(toDigestGame(game))
  }

  // Sort each sport's games by commence time
  for (const sport of Object.keys(gamesBySport)) {
    gamesBySport[sport].sort(
      (a, b) =>
        new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
    )
  }

  // Find significant line moves (variance > 30 pts on moneyline)
  const significantMoves: LineMoveItem[] = []
  for (const game of allGames) {
    for (const side of ['home', 'away'] as const) {
      const variance = getMoneylineVariance(game, side)
      if (variance > 30) {
        significantMoves.push({
          gameId: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          sport: game.sport,
          side,
          variance,
        })
      }
    }
  }
  significantMoves.sort((a, b) => b.variance - a.variance)

  // Format signals
  const strong = signals.filter((s) => s.strength === 'strong')
  const signalItems = signals.map((s: SmartSignal) => ({
    homeTeam: s.game.homeTeam,
    awayTeam: s.game.awayTeam,
    sport: s.game.sport,
    strength: s.strength,
    signalCount: s.signals.length,
    valueSide: s.bestValue.side,
    confidence: s.aiConfidence,
  }))

  return {
    date: new Date().toISOString().slice(0, 10),
    totalGames: allGames.length,
    gamesBySport,
    smartSignals: {
      total: signals.length,
      strong: strong.length,
      items: signalItems,
    },
    significantMoves,
    weeklyPickStats: null,
    disclaimer: AI_DISCLAIMER,
  }
}

/**
 * Enriches a digest with the user's weekly pick stats.
 * Call after generateDigest() with the user's recent pick data.
 */
export function enrichDigestWithPickStats(
  digest: DigestContent,
  picks: Array<{
    outcome: string | null
    profit: number | null
    units: number
    closing_odds: number | null
    odds: number
    game_date: string
  }>
): DigestContent {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const recent = picks.filter(
    (p) => p.outcome && p.outcome !== 'pending' && new Date(p.game_date) >= oneWeekAgo
  )

  if (recent.length === 0) return digest

  const wins = recent.filter((p) => p.outcome === 'win').length
  const losses = recent.filter((p) => p.outcome === 'loss').length
  const pushes = recent.filter((p) => p.outcome === 'push').length
  const totalProfit = recent.reduce((sum, p) => sum + (p.profit ?? 0), 0)
  const totalUnits = recent.reduce((sum, p) => sum + p.units, 0)
  const roi = totalUnits > 0 ? Math.round((totalProfit / totalUnits) * 10000) / 100 : 0

  const withClosing = recent.filter((p) => p.closing_odds != null)
  let clvRate: number | null = null
  if (withClosing.length > 0) {
    const positive = withClosing.filter((p) => {
      const betImpl = americanToImpliedProbability(p.odds)
      const closeImpl = americanToImpliedProbability(p.closing_odds!)
      return closeImpl > betImpl
    }).length
    clvRate = Math.round((positive / withClosing.length) * 1000) / 10
  }

  return {
    ...digest,
    weeklyPickStats: { wins, losses, pushes, roi, clvRate },
  }
}

/**
 * Formats digest content as plain text for email body.
 */
export function formatDigestText(digest: DigestContent): string {
  const lines: string[] = []

  lines.push(`BetBrain Daily Digest — ${digest.date}`)
  lines.push('='.repeat(45))
  lines.push('')

  // Smart Signals section
  if (digest.smartSignals.total > 0) {
    lines.push(`SMART SIGNALS (${digest.smartSignals.total})`)
    lines.push('-'.repeat(30))
    for (const s of digest.smartSignals.items) {
      const strength = s.strength === 'strong' ? '[STRONG]' : '[moderate]'
      const value = s.valueSide ? ` | Value: ${s.valueSide}` : ''
      const conf = s.confidence ? ` | AI: ${s.confidence}%` : ''
      lines.push(
        `  ${strength} ${s.awayTeam} @ ${s.homeTeam} (${s.sport.toUpperCase()})${value}${conf}`
      )
    }
    lines.push('')
  }

  // Significant line moves
  if (digest.significantMoves.length > 0) {
    lines.push(`LINE MOVES (${digest.significantMoves.length} significant)`)
    lines.push('-'.repeat(30))
    for (const m of digest.significantMoves.slice(0, 10)) {
      lines.push(
        `  ${m.awayTeam} @ ${m.homeTeam} — ${m.side} ML varies ${m.variance} pts across books`
      )
    }
    lines.push('')
  }

  // Games summary by sport
  lines.push(`TODAY'S GAMES (${digest.totalGames} total)`)
  lines.push('-'.repeat(30))
  for (const [sport, games] of Object.entries(digest.gamesBySport)) {
    lines.push(`  ${sport.toUpperCase()}: ${games.length} game${games.length !== 1 ? 's' : ''}`)
    for (const g of games.slice(0, 5)) {
      const time = new Date(g.commenceTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      const home = g.bestHomeOdds
        ? g.bestHomeOdds > 0
          ? `+${g.bestHomeOdds}`
          : `${g.bestHomeOdds}`
        : '—'
      const away = g.bestAwayOdds
        ? g.bestAwayOdds > 0
          ? `+${g.bestAwayOdds}`
          : `${g.bestAwayOdds}`
        : '—'
      lines.push(`    ${time} | ${g.awayTeam} (${away}) @ ${g.homeTeam} (${home})`)
    }
    if (games.length > 5) {
      lines.push(`    ...and ${games.length - 5} more`)
    }
  }

  // Weekly pick stats
  if (digest.weeklyPickStats) {
    const w = digest.weeklyPickStats
    lines.push('')
    lines.push('YOUR WEEK')
    lines.push('-'.repeat(30))
    lines.push(`  Record: ${w.wins}W-${w.losses}L${w.pushes > 0 ? `-${w.pushes}P` : ''}`)
    lines.push(`  ROI: ${w.roi >= 0 ? '+' : ''}${w.roi}%`)
    if (w.clvRate !== null) {
      lines.push(`  +CLV Rate: ${w.clvRate}%`)
    }
  }

  lines.push('')
  lines.push(digest.disclaimer)

  return lines.join('\n')
}

/**
 * Send digest email. Currently a no-op that logs to console.
 * Replace with Resend integration when ready.
 */
export async function sendDigestEmail(
  email: string,
  digest: DigestContent
): Promise<{ sent: boolean; preview: boolean }> {
  const text = formatDigestText(digest)
  console.log(`[digest] Would send to ${email}:`)
  console.log(text)

  // TODO: Replace with Resend when ready:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'BetBrain <digest@betbrain.app>',
  //   to: email,
  //   subject: `BetBrain Daily Digest — ${digest.date}`,
  //   text,
  // })

  return { sent: false, preview: true }
}
