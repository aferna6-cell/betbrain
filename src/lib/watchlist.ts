export interface WatchlistItem {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  addedAt: string
}

const STORAGE_KEY = 'betbrain-watchlist'

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WatchlistItem[]
  } catch {
    return []
  }
}

export function addToWatchlist(item: WatchlistItem): void {
  if (typeof window === 'undefined') return
  const current = getWatchlist()
  // Avoid duplicates
  if (current.some((w) => w.gameId === item.gameId)) return
  const updated = [...current, item]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function removeFromWatchlist(gameId: string): void {
  if (typeof window === 'undefined') return
  const current = getWatchlist()
  const updated = current.filter((w) => w.gameId !== gameId)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function isWatched(gameId: string): boolean {
  return getWatchlist().some((w) => w.gameId === gameId)
}

export function clearWatchlist(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
