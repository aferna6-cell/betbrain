export interface BacktestConfig {
  sport: string
  season: string          // e.g. "2024-25"
  strategy: 'smart-signals' | 'high-confidence' | 'value-plays'
  unitSize: number        // default 100
  startingBankroll: number // default 1000
}

export interface BacktestGame {
  date: string
  homeTeam: string
  awayTeam: string
  side: 'home' | 'away'
  odds: number            // American odds
  result: 'win' | 'loss' | 'push'
  profit: number
  runningBankroll: number
  signals: string[]
  confidence: number
}

export interface BacktestResult {
  config: BacktestConfig
  games: BacktestGame[]
  summary: {
    totalGames: number
    wins: number
    losses: number
    pushes: number
    winRate: number
    totalWagered: number
    totalProfit: number
    roi: number
    maxDrawdown: number
    bestStreak: number
    worstStreak: number
    peakBankroll: number
    finalBankroll: number
  }
  disclaimer: string
}

// FNV-1a hash for deterministic seeded randomness
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

const NBA_TEAMS = [
  'Lakers', 'Celtics', 'Warriors', 'Bucks', 'Nets', 'Heat', 'Nuggets', 'Suns',
  'Clippers', '76ers', 'Raptors', 'Bulls', 'Knicks', 'Mavericks', 'Grizzlies',
  'Hawks', 'Cavaliers', 'Jazz', 'Pelicans', 'Kings', 'Timberwolves', 'Trail Blazers',
  'Pacers', 'Hornets', 'Thunder', 'Wizards', 'Pistons', 'Magic', 'Rockets', 'Spurs',
]

const NFL_TEAMS = [
  'Chiefs', 'Eagles', 'Cowboys', '49ers', 'Bills', 'Ravens', 'Bengals', 'Lions',
  'Packers', 'Vikings', 'Bears', 'Rams', 'Chargers', 'Raiders', 'Broncos', 'Seahawks',
  'Saints', 'Buccaneers', 'Panthers', 'Falcons', 'Commanders', 'Giants', 'Jets', 'Patriots',
  'Dolphins', 'Steelers', 'Browns', 'Titans', 'Jaguars', 'Texans', 'Colts', 'Cardinals',
]

const MLB_TEAMS = [
  'Yankees', 'Red Sox', 'Dodgers', 'Giants', 'Cubs', 'Cardinals', 'Braves', 'Mets',
  'Astros', 'Athletics', 'Mariners', 'Angels', 'Padres', 'Rockies', 'Diamondbacks',
  'Phillies', 'Nationals', 'Marlins', 'Pirates', 'Reds', 'Brewers', 'Tigers', 'White Sox',
  'Indians', 'Twins', 'Royals', 'Blue Jays', 'Rays', 'Orioles', 'Rangers',
]

const NHL_TEAMS = [
  'Bruins', 'Maple Leafs', 'Rangers', 'Penguins', 'Blackhawks', 'Red Wings', 'Canadiens',
  'Senators', 'Sabres', 'Islanders', 'Devils', 'Flyers', 'Capitals', 'Blue Jackets',
  'Panthers', 'Lightning', 'Hurricanes', 'Predators', 'Blues', 'Wild', 'Jets', 'Avalanche',
  'Stars', 'Coyotes', 'Sharks', 'Ducks', 'Kings', 'Canucks', 'Oilers', 'Flames',
  'Golden Knights', 'Kraken',
]

const SMART_SIGNALS_LIST = [
  'Line movement: sharp money detected',
  'Public fade opportunity',
  'Injury-adjusted value',
  'Closing line value indicator',
  'Reverse line movement',
  'Steam move triggered',
  'Books disagreeing on price',
  'High confidence AI analysis',
]

function getTeams(sport: string): string[] {
  switch (sport.toLowerCase()) {
    case 'nfl': return NFL_TEAMS
    case 'mlb': return MLB_TEAMS
    case 'nhl': return NHL_TEAMS
    default:    return NBA_TEAMS
  }
}

function getSeasonGameCount(sport: string): number {
  switch (sport.toLowerCase()) {
    case 'nfl': return 17
    case 'mlb': return 162
    case 'nhl': return 82
    default:    return 82  // NBA
  }
}

interface StrategyConfig {
  winRate: number
  gamesFraction: number // fraction of season games to include
}

function getStrategyConfig(strategy: BacktestConfig['strategy']): StrategyConfig {
  switch (strategy) {
    case 'smart-signals':
      return { winRate: 0.565, gamesFraction: 1.0 }
    case 'high-confidence':
      return { winRate: 0.530, gamesFraction: 0.40 }
    case 'value-plays':
      return { winRate: 0.515, gamesFraction: 0.70 }
  }
}

// Compute profit for a unit bet at American odds
function computeProfit(result: 'win' | 'loss' | 'push', odds: number, unitSize: number): number {
  if (result === 'push') return 0
  if (result === 'loss') return -unitSize
  // win
  if (odds > 0) {
    return (odds / 100) * unitSize
  } else {
    return (100 / Math.abs(odds)) * unitSize
  }
}

// Generate a game date offset from Oct 1 (NBA/NHL) or April 1 (MLB) or Sep 1 (NFL)
function getGameDate(sport: string, season: string, gameIndex: number, totalGames: number): string {
  const seasonYear = parseInt(season.split('-')[0], 10) || 2024
  let startMonth: number
  let startDay: number

  switch (sport.toLowerCase()) {
    case 'nfl':
      startMonth = 9; startDay = 7; break
    case 'mlb':
      startMonth = 3; startDay = 28; break
    case 'nhl':
      startMonth = 10; startDay = 1; break
    default: // NBA
      startMonth = 10; startDay = 22; break
  }

  const startDate = new Date(seasonYear, startMonth - 1, startDay)
  // Spread games over ~6 months (180 days) for NBA/NHL/MLB, ~4.5 months (130 days) for NFL
  const spanDays = sport.toLowerCase() === 'nfl' ? 130 : 180
  const dayOffset = Math.floor((gameIndex / Math.max(totalGames - 1, 1)) * spanDays)
  const gameDate = new Date(startDate)
  gameDate.setDate(gameDate.getDate() + dayOffset)

  const year = gameDate.getFullYear()
  const month = String(gameDate.getMonth() + 1).padStart(2, '0')
  const day = String(gameDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function runBacktest(config: BacktestConfig): BacktestResult {
  const { sport, season, strategy, unitSize, startingBankroll } = config
  const teams = getTeams(sport)
  const seasonGameCount = getSeasonGameCount(sport)
  const stratCfg = getStrategyConfig(strategy)

  // Determine which games from the full season to include
  const includedGames: number[] = []
  for (let i = 0; i < seasonGameCount; i++) {
    const includeRoll = seededRandom(`${sport}-${season}-${strategy}-include-${i}`)
    if (includeRoll < stratCfg.gamesFraction) {
      includedGames.push(i)
    }
  }

  let runningBankroll = startingBankroll
  let peakBankroll = startingBankroll
  let maxDrawdown = 0
  let bestStreak = 0
  let worstStreak = 0
  let currentStreak = 0  // positive = winning streak, negative = losing streak
  let wins = 0
  let losses = 0
  let pushes = 0
  let totalWagered = 0

  const games: BacktestGame[] = []

  for (const gameIndex of includedGames) {
    const seedBase = `${sport}-${season}-${strategy}-${gameIndex}`

    // Pick two distinct teams
    const homeIdx = Math.floor(seededRandom(`${seedBase}-home`) * teams.length)
    let awayIdx = Math.floor(seededRandom(`${seedBase}-away`) * teams.length)
    if (awayIdx === homeIdx) awayIdx = (homeIdx + 1) % teams.length

    const homeTeam = teams[homeIdx]
    const awayTeam = teams[awayIdx]

    // Pick side (home or away)
    const sideRoll = seededRandom(`${seedBase}-side`)
    const side: 'home' | 'away' = sideRoll < 0.5 ? 'home' : 'away'

    // Generate realistic American odds (-130 to +115 range for ML favorites/dogs)
    const oddsRoll = seededRandom(`${seedBase}-odds`)
    // Range: -140 to +130, skewed toward -110 / -120 range
    const oddsOptions = [-140, -130, -120, -115, -110, -105, -100, +105, +110, +115, +120, +130]
    const odds = oddsOptions[Math.floor(oddsRoll * oddsOptions.length)]

    // Determine win/loss/push
    const resultRoll = seededRandom(`${seedBase}-result`)
    // Push is rare (~2%)
    let result: 'win' | 'loss' | 'push'
    if (resultRoll < 0.02) {
      result = 'push'
    } else {
      // Apply strategy win rate to the non-push portion
      const winThreshold = stratCfg.winRate
      const adjustedRoll = seededRandom(`${seedBase}-win`)
      result = adjustedRoll < winThreshold ? 'win' : 'loss'
    }

    // Pick 2-4 signals
    const signalCount = 2 + Math.floor(seededRandom(`${seedBase}-sigcount`) * 3)
    const signals: string[] = []
    const shuffleBase = seededRandom(`${seedBase}-sigshuffle`) * 1000
    for (let s = 0; s < signalCount; s++) {
      const sigIdx = Math.floor(seededRandom(`${seedBase}-sig-${s}-${shuffleBase}`) * SMART_SIGNALS_LIST.length)
      const sig = SMART_SIGNALS_LIST[sigIdx]
      if (!signals.includes(sig)) signals.push(sig)
    }

    // Confidence 60-92%
    const confidence = 60 + Math.floor(seededRandom(`${seedBase}-conf`) * 33)

    const profit = computeProfit(result, odds, unitSize)
    runningBankroll += profit
    totalWagered += unitSize

    // Track peak and drawdown
    if (runningBankroll > peakBankroll) {
      peakBankroll = runningBankroll
    }
    const drawdown = peakBankroll - runningBankroll
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }

    // Track streaks
    if (result === 'win') {
      wins++
      if (currentStreak >= 0) {
        currentStreak++
      } else {
        currentStreak = 1
      }
      if (currentStreak > bestStreak) bestStreak = currentStreak
    } else if (result === 'loss') {
      losses++
      if (currentStreak <= 0) {
        currentStreak--
      } else {
        currentStreak = -1
      }
      if (Math.abs(currentStreak) > worstStreak) worstStreak = Math.abs(currentStreak)
    } else {
      pushes++
      currentStreak = 0
    }

    const date = getGameDate(sport, season, gameIndex, seasonGameCount)

    games.push({
      date,
      homeTeam,
      awayTeam,
      side,
      odds,
      result,
      profit,
      runningBankroll: Math.round(runningBankroll * 100) / 100,
      signals,
      confidence,
    })
  }

  const totalGames = games.length
  const totalProfit = runningBankroll - startingBankroll
  const winRate = totalGames > 0 ? wins / (wins + losses) : 0
  const roi = totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0

  return {
    config,
    games,
    summary: {
      totalGames,
      wins,
      losses,
      pushes,
      winRate: Math.round(winRate * 1000) / 10, // percentage with 1 decimal
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      bestStreak,
      worstStreak,
      peakBankroll: Math.round(peakBankroll * 100) / 100,
      finalBankroll: Math.round(runningBankroll * 100) / 100,
    },
    disclaimer:
      'For informational purposes only. Past simulated performance does not guarantee future results.',
  }
}
