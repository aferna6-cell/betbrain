export interface LeaderboardEntry {
  rank: number
  displayName: string
  wins: number
  losses: number
  pushes: number
  winRate: number
  totalProfit: number
  roi: number
  streak: string        // e.g. "W3", "L1"
  favoriteSport: string // e.g. "NBA"
  totalPicks: number
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  lastUpdated: string
  totalParticipants: number
}

// FNV-1a hash for deterministic seeded randomness (same pattern as backtesting.ts)
function fnv1a(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return hash
}

function seededRandom(seed: string): number {
  return (fnv1a(seed) % 10000) / 10000
}

const DISPLAY_NAMES = [
  'SharpShooter',
  'ValueHunter',
  'DimeDropper',
  'StatGeek',
  'LineWatcher',
  'CoverKing',
  'EdgeFinder',
  'GrindingUnits',
  'SmartMoney88',
  'ClosingLineGod',
  'PublicFader',
  'SteamChaser',
  'OddsWizard',
  'ZeroJuice',
  'MLBGrinder',
  'NBAValuePlay',
  'NFLSharp',
  'PuckLines',
  'UnitBuilder',
  'BeatTheBook',
  'PropHunter',
  'MarketMover',
  'ExpectedValue',
  'LineBreaker',
  'TrueSharp',
]

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL']

const STREAK_WINS = ['W1', 'W2', 'W3', 'W4', 'W5']
const STREAK_LOSSES = ['L1', 'L2', 'L3']

function generateEntry(index: number): Omit<LeaderboardEntry, 'rank'> {
  const seed = `leaderboard-entry-${index}`

  const displayName = DISPLAY_NAMES[index % DISPLAY_NAMES.length]

  // Total picks: 20 to 200
  const totalPicks = 20 + Math.floor(seededRandom(`${seed}-picks`) * 181)

  // Win rate: 48% to 62%
  const winRate = 48 + seededRandom(`${seed}-winrate`) * 14

  // Compute wins/losses/pushes from winRate and totalPicks
  // ~3% push rate
  const pushes = Math.round(totalPicks * 0.03)
  const decided = totalPicks - pushes
  const wins = Math.round(decided * (winRate / 100))
  const losses = decided - wins

  // ROI: -5% to +15%
  const roi = -5 + seededRandom(`${seed}-roi`) * 20

  // Total profit derived from ROI and totalPicks (assume avg 1 unit per pick)
  const totalProfit = Math.round(totalPicks * (roi / 100) * 10) / 10

  // Favorite sport
  const sportIndex = Math.floor(seededRandom(`${seed}-sport`) * SPORTS.length)
  const favoriteSport = SPORTS[sportIndex]

  // Streak: ~60% chance of a win streak, 40% loss streak
  let streak: string
  if (seededRandom(`${seed}-streaktype`) < 0.6) {
    const streakIndex = Math.floor(seededRandom(`${seed}-streaklen`) * STREAK_WINS.length)
    streak = STREAK_WINS[streakIndex]
  } else {
    const streakIndex = Math.floor(seededRandom(`${seed}-streaklen`) * STREAK_LOSSES.length)
    streak = STREAK_LOSSES[streakIndex]
  }

  return {
    displayName,
    wins,
    losses,
    pushes,
    winRate: Math.round(winRate * 10) / 10,
    totalProfit,
    roi: Math.round(roi * 100) / 100,
    streak,
    favoriteSport,
    totalPicks,
  }
}

export function getLeaderboard(
  sortBy: 'roi' | 'profit' | 'winRate' | 'picks' = 'roi',
): LeaderboardResult {
  const entries: Array<Omit<LeaderboardEntry, 'rank'>> = Array.from(
    { length: 25 },
    (_, i) => generateEntry(i),
  )

  // Sort descending by the requested column
  entries.sort((a, b) => {
    switch (sortBy) {
      case 'profit':
        return b.totalProfit - a.totalProfit
      case 'winRate':
        return b.winRate - a.winRate
      case 'picks':
        return b.totalPicks - a.totalPicks
      case 'roi':
      default:
        return b.roi - a.roi
    }
  })

  const ranked: LeaderboardEntry[] = entries.map((entry, i) => ({
    rank: i + 1,
    ...entry,
  }))

  return {
    entries: ranked,
    lastUpdated: new Date().toISOString(),
    totalParticipants: 25,
  }
}
