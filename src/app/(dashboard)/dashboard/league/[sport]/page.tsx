import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOddsForSport } from '@/lib/sports/odds'
import { GameCard } from '@/components/game-card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Sport } from '@/lib/supabase/types'
import type { NormalizedGame } from '@/lib/sports/config'

const VALID_SPORTS: Sport[] = ['nba', 'nfl', 'mlb', 'nhl']

export const revalidate = 300 // Rebuild every 5 minutes

export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }): Promise<Metadata> {
  const { sport } = await params
  const label = sport.toUpperCase()
  return {
    title: `${label} Games — BetBrain`,
    description: `${label} upcoming games with odds comparison and AI analysis.`,
  }
}

/** Group NFL games by time slot for Sunday Slate view */
function groupNFLBySlot(games: NormalizedGame[]): { label: string; games: NormalizedGame[] }[] {
  const groups = new Map<string, NormalizedGame[]>()

  for (const game of games) {
    const d = new Date(game.commenceTime)
    const day = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
    const hour = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    })

    let label: string
    const etHour = Number(d.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }))

    if (day === 'Thursday') {
      label = `Thursday Night — ${hour} ET`
    } else if (day === 'Monday') {
      label = `Monday Night — ${hour} ET`
    } else if (day === 'Sunday' && etHour >= 20) {
      label = `Sunday Night — ${hour} ET`
    } else if (day === 'Sunday' && etHour >= 16) {
      label = `Sunday Late — ${hour} ET`
    } else if (day === 'Sunday') {
      label = `Sunday Early — ${hour} ET`
    } else if (day === 'Saturday') {
      label = `Saturday — ${hour} ET`
    } else {
      label = `${day} — ${hour} ET`
    }

    const existing = groups.get(label) ?? []
    existing.push(game)
    groups.set(label, existing)
  }

  return Array.from(groups.entries()).map(([label, games]) => ({ label, games }))
}

const LEAGUE_INFO: Record<Sport, { name: string; fullName: string }> = {
  nba: { name: 'NBA', fullName: 'National Basketball Association' },
  nfl: { name: 'NFL', fullName: 'National Football League' },
  mlb: { name: 'MLB', fullName: 'Major League Baseball' },
  nhl: { name: 'NHL', fullName: 'National Hockey League' },
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ sport: string }>
}) {
  const { sport } = await params

  if (!VALID_SPORTS.includes(sport as Sport)) {
    notFound()
  }

  const sportKey = sport as Sport
  const league = LEAGUE_INFO[sportKey]
  const result = await getOddsForSport(sportKey)

  const sortedGames = [...result.games].sort(
    (a, b) =>
      new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
  )

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{league.name}</h1>
          <Badge variant="secondary" className="text-xs">
            {sortedGames.length} games
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground">{league.fullName}</p>
      </div>

      {result.dataNotice && (
        <p className="text-sm text-yellow-500">{result.dataNotice}</p>
      )}

      {sortedGames.length > 0 ? (
        sportKey === 'nfl' ? (
          <div className="space-y-8">
            {groupNFLBySlot(sortedGames).map((slot) => (
              <div key={slot.label}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{slot.label}</h2>
                  <Badge variant="outline" className="text-xs">
                    {slot.games.length} game{slot.games.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {slot.games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No upcoming {league.name} games found. Check back later.
          </p>
        </div>
      )}
    </div>
  )
}
