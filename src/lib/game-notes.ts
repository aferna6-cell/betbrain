/**
 * Game Notes — personal notes per game stored in localStorage.
 *
 * Lets the user jot down pre-game thoughts and post-game reflections
 * for any game, accessible from the game detail page.
 */

export interface GameNote {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  preGame: string // thoughts before the game
  postGame: string // reflections after
  tags: string[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'betbrain_game_notes'

function loadNotes(): GameNote[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GameNote[]) : []
  } catch {
    return []
  }
}

function saveNotes(notes: GameNote[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export function getGameNote(gameId: string): GameNote | null {
  return loadNotes().find((n) => n.gameId === gameId) ?? null
}

export function getAllGameNotes(): GameNote[] {
  return loadNotes().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function saveGameNote(
  gameId: string,
  data: {
    sport: string
    homeTeam: string
    awayTeam: string
    preGame: string
    postGame: string
    tags: string[]
  }
): GameNote {
  const notes = loadNotes()
  const idx = notes.findIndex((n) => n.gameId === gameId)
  const now = new Date().toISOString()

  if (idx >= 0) {
    notes[idx] = { ...notes[idx], ...data, updatedAt: now }
    saveNotes(notes)
    return notes[idx]
  }

  const note: GameNote = {
    gameId,
    ...data,
    createdAt: now,
    updatedAt: now,
  }
  notes.push(note)
  saveNotes(notes)
  return note
}

export function deleteGameNote(gameId: string): boolean {
  const notes = loadNotes()
  const filtered = notes.filter((n) => n.gameId !== gameId)
  if (filtered.length === notes.length) return false
  saveNotes(filtered)
  return true
}

export function getNotesCount(): number {
  return loadNotes().length
}
