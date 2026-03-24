import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Profile — BetBrain',
  description: 'Manage your account settings and view your pick tracker record.',
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ProfileForm } from './profile-form'
import { ShareButton } from '@/components/share-button'
import { calculateCLVStats } from '@/lib/clv'
import type { Database, Sport } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type UserPickRow = Database['public']['Tables']['user_picks']['Row']

// ---------------------------------------------------------------------------
// Pick stats helpers — mirrors the logic in src/app/api/picks/route.ts
// ---------------------------------------------------------------------------

interface PickStats {
  total: number
  wins: number
  losses: number
  pushes: number
  pending: number
  winRate: number | null   // null when no resolved picks
  roi: number              // percentage, can be negative
  favoriteSport: Sport | null
}

function calcPickStats(picks: UserPickRow[]): PickStats {
  const resolved = picks.filter((p) => p.outcome && p.outcome !== 'pending')
  const wins = resolved.filter((p) => p.outcome === 'win').length
  const losses = resolved.filter((p) => p.outcome === 'loss').length
  const pushes = resolved.filter((p) => p.outcome === 'push').length
  const totalProfit = resolved.reduce((sum, p) => sum + (p.profit ?? 0), 0)
  const totalUnits = resolved.reduce((sum, p) => sum + p.units, 0)
  const roi = totalUnits > 0 ? (totalProfit / totalUnits) * 100 : 0

  // Win rate excludes pushes from the denominator
  const decidedCount = wins + losses
  const winRate = decidedCount > 0 ? wins / decidedCount : null

  // Favorite sport: sport with the most picks
  const sportCounts = picks.reduce<Partial<Record<Sport, number>>>((acc, p) => {
    acc[p.sport] = (acc[p.sport] ?? 0) + 1
    return acc
  }, {})
  const favoriteSport =
    picks.length > 0
      ? (Object.entries(sportCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as Sport)
      : null

  return {
    total: picks.length,
    wins,
    losses,
    pushes,
    pending: picks.length - resolved.length,
    winRate,
    roi: Math.round(roi * 100) / 100,
    favoriteSport,
  }
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Profile and picks fetched in parallel
  const [{ data: profileData }, { data: picksData }] = await Promise.all([
    supabase.from('profiles').select('*').single(),
    supabase
      .from('user_picks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const profile = profileData as Profile | null
  const picks = (picksData as UserPickRow[] | null) ?? []
  const stats = calcPickStats(picks)
  const clvStats = calculateCLVStats(picks)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account settings
          </p>
        </div>
        {user && <ShareButton userId={user.id} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '\u2014'}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-2xl font-bold">Personal</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Daily analyses used</p>
              <p className="font-medium">
                {profile?.analyses_today ?? 0} / Unlimited
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pick Tracker Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Pick Tracker Record</CardTitle>
            <CardDescription>Your all-time betting record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                No picks logged yet. Start tracking your bets in the Pick Tracker.
              </p>
            ) : (
              <>
                {/* W/L/P record */}
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-green-400">{stats.wins}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-2xl font-bold text-red-400">{stats.losses}</span>
                  {stats.pushes > 0 && (
                    <>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-2xl font-bold text-muted-foreground">{stats.pushes}</span>
                    </>
                  )}
                  <span className="ml-1 text-sm text-muted-foreground">
                    W{stats.pushes > 0 ? '-L-P' : '-L'}
                  </span>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total picks</p>
                    <p className="font-medium">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="font-medium">{stats.pending}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win rate</p>
                    <p
                      className={`font-medium ${
                        stats.winRate === null
                          ? 'text-muted-foreground'
                          : stats.winRate >= 0.5
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {stats.winRate !== null
                        ? `${(stats.winRate * 100).toFixed(1)}%`
                        : '\u2014'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p
                      className={`font-medium ${
                        stats.roi > 0
                          ? 'text-green-400'
                          : stats.roi < 0
                          ? 'text-red-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {stats.roi > 0 ? '+' : ''}
                      {stats.roi.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {stats.favoriteSport && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Favorite sport</p>
                      <p className="font-medium uppercase">{stats.favoriteSport}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {clvStats.totalPicks > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Closing Line Value</CardTitle>
              <CardDescription>How often you beat the closing line</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-400">Avg CLV</p>
                  <p className={`text-2xl font-bold ${
                    clvStats.averageCLV > 0 ? 'text-green-400' : clvStats.averageCLV < 0 ? 'text-red-400' : ''
                  }`}>
                    {clvStats.averageCLV > 0 ? '+' : ''}{clvStats.averageCLV}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-400">Weighted CLV</p>
                  <p className={`text-2xl font-bold ${
                    clvStats.weightedCLV > 0 ? 'text-green-400' : clvStats.weightedCLV < 0 ? 'text-red-400' : ''
                  }`}>
                    {clvStats.weightedCLV > 0 ? '+' : ''}{clvStats.weightedCLV}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-400">+CLV Rate</p>
                  <p className="font-medium">{clvStats.positiveCLVRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-blue-400">CLV Tracked</p>
                  <p className="font-medium">{clvStats.totalPicks} picks</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Positive CLV means you consistently get better prices than the closing line — the #1 predictor of long-term profitability.
              </p>
            </CardContent>
          </Card>
        )}

        {stats.total >= 3 && (() => {
          const sports = ['nba', 'nfl', 'mlb', 'nhl'] as const
          const sportStats = sports.map((s) => {
            const sp = picks.filter((p) => p.sport === s)
            const res = sp.filter((p) => p.outcome && p.outcome !== 'pending')
            const w = res.filter((p) => p.outcome === 'win').length
            const l = res.filter((p) => p.outcome === 'loss').length
            const profit = res.reduce((sum, p) => sum + (p.profit ?? 0), 0)
            const units = res.reduce((sum, p) => sum + p.units, 0)
            const roi = units > 0 ? Math.round((profit / units) * 10000) / 100 : 0
            return { sport: s, total: sp.length, wins: w, losses: l, roi }
          }).filter((s) => s.total > 0)

          if (sportStats.length < 2) return null

          return (
            <Card>
              <CardHeader>
                <CardTitle>Performance by Sport</CardTitle>
                <CardDescription>Your record across each sport</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sportStats.map((s) => (
                    <div key={s.sport} className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
                      <span className="text-sm font-medium uppercase">{s.sport}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{s.wins}W-{s.losses}L</span>
                        <span className={`font-mono ${s.roi > 0 ? 'text-green-400' : s.roi < 0 ? 'text-red-400' : ''}`}>
                          {s.roi > 0 ? '+' : ''}{s.roi}%
                        </span>
                        <span className="text-muted-foreground">{s.total} picks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })()}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm displayName={profile?.display_name ?? ''} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
