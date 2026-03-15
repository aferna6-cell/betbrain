'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface H2HMeeting {
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  /** Team that covered the spread */
  atsCover: 'home' | 'away'
  /** Spread that was offered */
  spreadLine: number
  /** Total points relative to the O/U line */
  ouResult: 'over' | 'under'
  /** The over/under line */
  ouLine: number
}

interface H2HHistoryProps {
  homeTeam: string
  awayTeam: string
}

// ---------------------------------------------------------------------------
// Deterministic seeded RNG — hash of team names keeps results stable
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

/** Simple LCG seeded from a number. Returns 0–1 floats. */
function makeRng(seed: number) {
  let state = seed
  return function next(): number {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

// ---------------------------------------------------------------------------
// Mock data generator
// ---------------------------------------------------------------------------

/** Score ranges per sport — keyed by rough heuristic */
const SCORE_RANGES = [
  { min: 88, max: 128, ouBase: 215 },  // basketball-like
  { min: 90, max: 118, ouBase: 210 },  // alternate
  { min: 14, max: 42,  ouBase: 50  },  // football-like
  { min: 1,  max: 8,   ouBase: 6   },  // hockey-like
  { min: 2,  max: 12,  ouBase: 9   },  // baseball-like
]

function generateMeetings(homeTeam: string, awayTeam: string): H2HMeeting[] {
  const seed = hashString(`${homeTeam}::${awayTeam}`)
  const rng = makeRng(seed)

  // Pick score range from seed so it stays consistent per matchup
  const rangeIndex = Math.floor(rng() * SCORE_RANGES.length)
  const range = SCORE_RANGES[rangeIndex]

  const NUM_MEETINGS = 7
  const meetings: H2HMeeting[] = []

  // Start from ~30 months ago and space meetings ~5 months apart
  const now = new Date('2026-03-13')

  for (let i = 0; i < NUM_MEETINGS; i++) {
    const monthsAgo = 30 - i * (30 / NUM_MEETINGS)
    const meetingDate = new Date(now)
    meetingDate.setMonth(meetingDate.getMonth() - Math.round(monthsAgo))

    // Alternate home/away each meeting
    const isFlipped = i % 2 === 1
    const h = isFlipped ? awayTeam : homeTeam
    const a = isFlipped ? homeTeam : awayTeam

    const hScore =
      Math.round(range.min + rng() * (range.max - range.min))
    const aScore =
      Math.round(range.min + rng() * (range.max - range.min))

    const spreadLine = parseFloat(
      (-(rng() * 10 - 5)).toFixed(1)
    )

    const totalPoints = hScore + aScore
    const ouLine = parseFloat(
      (range.ouBase + (rng() * 20 - 10)).toFixed(1)
    )

    // Determine ATS cover
    const adjustedHome = hScore + spreadLine
    const atsCover: 'home' | 'away' = adjustedHome > aScore ? 'home' : 'away'

    // Determine O/U
    const ouResult: 'over' | 'under' = totalPoints > ouLine ? 'over' : 'under'

    meetings.push({
      date: meetingDate.toISOString().slice(0, 10),
      homeTeam: h,
      awayTeam: a,
      homeScore: hScore,
      awayScore: aScore,
      atsCover,
      spreadLine,
      ouResult,
      ouLine,
    })
  }

  // Most recent first
  return meetings.reverse()
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

interface SummaryStats {
  homeWins: number
  awayWins: number
  homeAtsWins: number
  awayAtsWins: number
  overs: number
  unders: number
  total: number
}

function computeStats(
  meetings: H2HMeeting[],
  perspectiveHome: string
): SummaryStats {
  let homeWins = 0
  let awayWins = 0
  let homeAtsWins = 0
  let awayAtsWins = 0
  let overs = 0
  let unders = 0

  for (const m of meetings) {
    const isPerspectiveHome = m.homeTeam === perspectiveHome
    const homeWon = m.homeScore > m.awayScore

    if (homeWon) {
      if (isPerspectiveHome) homeWins++
      else awayWins++
    } else {
      if (isPerspectiveHome) awayWins++
      else homeWins++
    }

    const perspectieCovered =
      (isPerspectiveHome && m.atsCover === 'home') ||
      (!isPerspectiveHome && m.atsCover === 'away')

    if (perspectieCovered) homeAtsWins++
    else awayAtsWins++

    if (m.ouResult === 'over') overs++
    else unders++
  }

  return {
    homeWins,
    awayWins,
    homeAtsWins,
    awayAtsWins,
    overs,
    unders,
    total: meetings.length,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSpread(line: number): string {
  return line >= 0 ? `+${line}` : `${line}`
}

function winnerLabel(meeting: H2HMeeting): string {
  return meeting.homeScore > meeting.awayScore
    ? meeting.homeTeam
    : meeting.awayTeam
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'green' | 'red' | 'muted'
}) {
  const colorMap = {
    green: 'text-green-500',
    red: 'text-red-500',
    muted: 'text-muted-foreground',
  }
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-bold tabular-nums ${highlight ? colorMap[highlight] : ''}`}
      >
        {value}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function H2HHistory({ homeTeam, awayTeam }: H2HHistoryProps) {
  const meetings = useMemo(
    () => generateMeetings(homeTeam, awayTeam),
    [homeTeam, awayTeam]
  )

  const stats = useMemo(
    () => computeStats(meetings, homeTeam),
    [meetings, homeTeam]
  )

  const homeLeads = stats.homeWins >= stats.awayWins
  const homeAtsLeads = stats.homeAtsWins >= stats.awayAtsWins

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">
          Head-to-Head History
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Historical data coming soon. Showing simulated matchup trends.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill
          label={`Series (last ${stats.total})`}
          value={`${homeTeam.split(' ').pop()} ${stats.homeWins}–${stats.awayWins}`}
          highlight={homeLeads ? 'green' : 'red'}
        />
        <StatPill
          label="ATS Record"
          value={`${homeTeam.split(' ').pop()} ${stats.homeAtsWins}–${stats.awayAtsWins}`}
          highlight={homeAtsLeads ? 'green' : 'red'}
        />
        <StatPill
          label="O/U Trend"
          value={`Over ${stats.overs}–${stats.unders}`}
          highlight={stats.overs > stats.unders ? 'green' : 'muted'}
        />
        <StatPill
          label="Meetings"
          value={String(stats.total)}
          highlight="muted"
        />
      </div>

      {/* Meetings table */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent Meetings
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Matchup</th>
                <th className="pb-2 pr-4 font-medium text-right">Score</th>
                <th className="pb-2 pr-4 font-medium text-center">ATS</th>
                <th className="pb-2 font-medium text-center">O/U</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m, i) => {
                const winner = winnerLabel(m)
                const isHomeWin = m.homeScore > m.awayScore
                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0"
                  >
                    {/* Date */}
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(m.date)}
                    </td>

                    {/* Matchup */}
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">
                        {m.awayTeam}{' '}
                        <span className="text-muted-foreground/60">@</span>{' '}
                        {m.homeTeam}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-2.5 pr-4 text-right font-mono text-xs whitespace-nowrap">
                      <span
                        className={
                          isHomeWin ? 'text-foreground' : 'text-muted-foreground'
                        }
                      >
                        {m.homeScore}
                      </span>
                      <span className="mx-1 text-muted-foreground/50">–</span>
                      <span
                        className={
                          !isHomeWin
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {m.awayScore}
                      </span>
                      <span className="ml-2 text-muted-foreground/60">
                        ({winner.split(' ').pop()} W)
                      </span>
                    </td>

                    {/* ATS */}
                    <td className="py-2.5 pr-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono ${
                          m.atsCover === 'home'
                            ? 'text-green-500 border-green-500/30'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {m.atsCover === 'home' ? m.homeTeam.split(' ').pop() : m.awayTeam.split(' ').pop()}{' '}
                        {formatSpread(m.spreadLine)}
                      </Badge>
                    </td>

                    {/* O/U */}
                    <td className="py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          m.ouResult === 'over'
                            ? 'text-green-500 border-green-500/30'
                            : 'text-red-500 border-red-500/30'
                        }`}
                      >
                        {m.ouResult === 'over' ? 'Over' : 'Under'}{' '}
                        {m.ouLine}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <p className="border-t border-border pt-3 text-xs italic text-muted-foreground">
        Historical data coming soon. Showing simulated matchup trends based on
        team names. For informational purposes only.
      </p>
    </div>
  )
}
