/**
 * Betting Journal — pure utility functions for journal entries.
 *
 * Journal entries are stored in localStorage (no Supabase table needed for personal tool).
 * Each entry captures a day's reflections: mood, bankroll snapshot, lessons, notes.
 */

export type JournalMood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible'

export interface JournalEntry {
  id: string
  date: string // YYYY-MM-DD
  mood: JournalMood
  bankroll: number | null
  title: string
  notes: string // free-form markdown-ish notes
  lessons: string[] // key takeaways
  tags: string[] // custom tags like "nba", "live betting", "tilt"
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'betbrain_journal'

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as JournalEntry[]) : []
  } catch {
    return []
  }
}

function saveEntries(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAllEntries(): JournalEntry[] {
  return loadEntries().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export function getEntry(id: string): JournalEntry | null {
  return loadEntries().find((e) => e.id === id) ?? null
}

export function getEntryByDate(date: string): JournalEntry | null {
  return loadEntries().find((e) => e.date === date) ?? null
}

export function createEntry(
  input: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
): JournalEntry {
  const entries = loadEntries()
  const now = new Date().toISOString()
  const entry: JournalEntry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
  entries.push(entry)
  saveEntries(entries)
  return entry
}

export function updateEntry(
  id: string,
  updates: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>
): JournalEntry | null {
  const entries = loadEntries()
  const idx = entries.findIndex((e) => e.id === id)
  if (idx === -1) return null
  entries[idx] = {
    ...entries[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveEntries(entries)
  return entries[idx]
}

export function deleteEntry(id: string): boolean {
  const entries = loadEntries()
  const filtered = entries.filter((e) => e.id !== id)
  if (filtered.length === entries.length) return false
  saveEntries(filtered)
  return true
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface JournalStats {
  totalEntries: number
  currentStreak: number // consecutive days with entries
  moodDistribution: Record<JournalMood, number>
  avgBankroll: number | null
  bankrollTrend: { date: string; bankroll: number }[]
  topTags: { tag: string; count: number }[]
  lessonsCount: number
}

export function calculateJournalStats(entries: JournalEntry[]): JournalStats {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Mood distribution
  const moodDist: Record<JournalMood, number> = {
    great: 0,
    good: 0,
    neutral: 0,
    bad: 0,
    terrible: 0,
  }
  for (const e of sorted) {
    moodDist[e.mood]++
  }

  // Bankroll trend
  const bankrollEntries = sorted
    .filter((e) => e.bankroll !== null)
    .map((e) => ({ date: e.date, bankroll: e.bankroll! }))
    .reverse() // chronological order

  const avgBankroll =
    bankrollEntries.length > 0
      ? bankrollEntries.reduce((s, e) => s + e.bankroll, 0) / bankrollEntries.length
      : null

  // Tag frequency
  const tagCounts = new Map<string, number>()
  for (const e of sorted) {
    for (const tag of e.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  // Streak (consecutive days from today backwards)
  let streak = 0
  if (sorted.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateSet = new Set(sorted.map((e) => e.date))
    const d = new Date(today)
    while (dateSet.has(formatDate(d))) {
      streak++
      d.setDate(d.getDate() - 1)
    }
  }

  const lessonsCount = sorted.reduce((s, e) => s + e.lessons.length, 0)

  return {
    totalEntries: sorted.length,
    currentStreak: streak,
    moodDistribution: moodDist,
    avgBankroll,
    bankrollTrend: bankrollEntries,
    topTags,
    lessonsCount,
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportJournalToCSV(entries: JournalEntry[]): string {
  const header = 'Date,Title,Mood,Bankroll,Lessons,Tags,Notes'
  const rows = entries.map((e) => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    return [
      e.date,
      esc(e.title),
      e.mood,
      e.bankroll ?? '',
      esc(e.lessons.join('; ')),
      esc(e.tags.join(', ')),
      esc(e.notes.slice(0, 200)),
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const MOOD_EMOJI: Record<JournalMood, string> = {
  great: '🔥',
  good: '😊',
  neutral: '😐',
  bad: '😞',
  terrible: '💀',
}

export const MOOD_COLORS: Record<JournalMood, string> = {
  great: 'text-green-500',
  good: 'text-emerald-400',
  neutral: 'text-yellow-500',
  bad: 'text-orange-500',
  terrible: 'text-red-500',
}

export const SUGGESTED_TAGS = [
  'nba', 'nfl', 'mlb', 'nhl',
  'live betting', 'parlay', 'props',
  'tilt', 'disciplined', 'value bet',
  'steam move', 'contrarian', 'chalk',
  'rest day', 'research day',
]
