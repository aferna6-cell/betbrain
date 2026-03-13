import { notFound } from 'next/navigation'
import { getOddsForSport } from '@/lib/sports/odds'
import { GameCard } from '@/components/game-card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Sport } from '@/lib/supabase/types'

const VALID_SPORTS: Sport[] = ['nba', 'nfl', 'mlb', 'nhl']

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
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
