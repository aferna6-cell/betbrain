/**
 * Bookmaker brand colors for odds table visual differentiation.
 *
 * Maps bookmaker key (from The Odds API) to a color scheme.
 */

export interface BookColor {
  bg: string // tailwind bg class for subtle row highlighting
  text: string // tailwind text class for book name
  dot: string // hex color for dot/accent
  label: string // display name
}

export const BOOK_COLORS: Record<string, BookColor> = {
  draftkings: {
    bg: 'bg-green-500/5',
    text: 'text-green-400',
    dot: '#00b75f',
    label: 'DraftKings',
  },
  fanduel: {
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    dot: '#1493ff',
    label: 'FanDuel',
  },
  betmgm: {
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    dot: '#c4a300',
    label: 'BetMGM',
  },
  pointsbet: {
    bg: 'bg-red-500/5',
    text: 'text-red-400',
    dot: '#e73e3e',
    label: 'PointsBet',
  },
  caesars: {
    bg: 'bg-yellow-500/5',
    text: 'text-yellow-400',
    dot: '#d4af37',
    label: 'Caesars',
  },
  bovada: {
    bg: 'bg-red-600/5',
    text: 'text-red-500',
    dot: '#cc0000',
    label: 'Bovada',
  },
  betonlineag: {
    bg: 'bg-orange-500/5',
    text: 'text-orange-400',
    dot: '#ff6600',
    label: 'BetOnline',
  },
  mybookieag: {
    bg: 'bg-purple-500/5',
    text: 'text-purple-400',
    dot: '#8b5cf6',
    label: 'MyBookie',
  },
  betrivers: {
    bg: 'bg-sky-500/5',
    text: 'text-sky-400',
    dot: '#0ea5e9',
    label: 'BetRivers',
  },
  unibet: {
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    dot: '#00875f',
    label: 'Unibet',
  },
  williamhill_us: {
    bg: 'bg-indigo-500/5',
    text: 'text-indigo-400',
    dot: '#003087',
    label: 'William Hill',
  },
  wynnbet: {
    bg: 'bg-rose-500/5',
    text: 'text-rose-400',
    dot: '#c41e3a',
    label: 'WynnBET',
  },
  superbook: {
    bg: 'bg-teal-500/5',
    text: 'text-teal-400',
    dot: '#14b8a6',
    label: 'SuperBook',
  },
  betfred: {
    bg: 'bg-blue-600/5',
    text: 'text-blue-500',
    dot: '#0033a0',
    label: 'Betfred',
  },
  lowvig: {
    bg: 'bg-lime-500/5',
    text: 'text-lime-400',
    dot: '#65a30d',
    label: 'LowVig',
  },
  pinnacle: {
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-400',
    dot: '#06b6d4',
    label: 'Pinnacle',
  },
  bet365: {
    bg: 'bg-green-600/5',
    text: 'text-green-500',
    dot: '#006c35',
    label: 'bet365',
  },
  barstool: {
    bg: 'bg-zinc-500/5',
    text: 'text-zinc-400',
    dot: '#71717a',
    label: 'Barstool',
  },
  espnbet: {
    bg: 'bg-red-500/5',
    text: 'text-red-400',
    dot: '#d00000',
    label: 'ESPN BET',
  },
  fanatics: {
    bg: 'bg-green-400/5',
    text: 'text-green-400',
    dot: '#22c55e',
    label: 'Fanatics',
  },
  hard_rock: {
    bg: 'bg-amber-600/5',
    text: 'text-amber-500',
    dot: '#b45309',
    label: 'Hard Rock',
  },
}

/**
 * Get color config for a bookmaker key.
 * Falls back to neutral gray if bookmaker is unknown.
 */
export function getBookColor(bookmakerKey: string): BookColor {
  return (
    BOOK_COLORS[bookmakerKey] ?? {
      bg: 'bg-muted/30',
      text: 'text-muted-foreground',
      dot: '#71717a',
      label: bookmakerKey.replace(/_/g, ' '),
    }
  )
}

/**
 * Format bookmaker key to display name.
 */
export function formatBookName(key: string): string {
  return BOOK_COLORS[key]?.label ?? key.replace(/_/g, ' ')
}
