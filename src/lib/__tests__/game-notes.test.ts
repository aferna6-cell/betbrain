import { describe, it, expect, beforeEach, vi } from 'vitest'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
  length: 0,
  key: vi.fn(() => null),
}

vi.stubGlobal('window', { localStorage: localStorageMock })
vi.stubGlobal('localStorage', localStorageMock)

import {
  getGameNote,
  getAllGameNotes,
  saveGameNote,
  deleteGameNote,
  getNotesCount,
} from '../game-notes'

describe('game-notes', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('saves and retrieves a game note', () => {
    saveGameNote('game-1', {
      sport: 'nba',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      preGame: 'Lakers should cover',
      postGame: '',
      tags: ['nba'],
    })

    const note = getGameNote('game-1')
    expect(note).not.toBeNull()
    expect(note!.preGame).toBe('Lakers should cover')
    expect(note!.homeTeam).toBe('Lakers')
  })

  it('updates existing note for same gameId', () => {
    saveGameNote('game-1', {
      sport: 'nba',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      preGame: 'Original',
      postGame: '',
      tags: [],
    })
    saveGameNote('game-1', {
      sport: 'nba',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      preGame: 'Updated',
      postGame: 'They won!',
      tags: ['winner'],
    })

    const notes = getAllGameNotes()
    expect(notes.length).toBe(1)
    expect(notes[0].preGame).toBe('Updated')
    expect(notes[0].postGame).toBe('They won!')
  })

  it('getAllGameNotes returns all saved notes', () => {
    saveGameNote('game-1', {
      sport: 'nba',
      homeTeam: 'A',
      awayTeam: 'B',
      preGame: 'First',
      postGame: '',
      tags: [],
    })
    saveGameNote('game-2', {
      sport: 'nba',
      homeTeam: 'C',
      awayTeam: 'D',
      preGame: 'Second',
      postGame: '',
      tags: [],
    })

    const notes = getAllGameNotes()
    expect(notes.length).toBe(2)
    const preGames = notes.map((n) => n.preGame)
    expect(preGames).toContain('First')
    expect(preGames).toContain('Second')
  })

  it('deletes a note', () => {
    saveGameNote('game-1', {
      sport: 'nba',
      homeTeam: 'A',
      awayTeam: 'B',
      preGame: 'X',
      postGame: '',
      tags: [],
    })
    expect(deleteGameNote('game-1')).toBe(true)
    expect(getGameNote('game-1')).toBeNull()
  })

  it('delete returns false for missing note', () => {
    expect(deleteGameNote('nonexistent')).toBe(false)
  })

  it('getNotesCount returns correct count', () => {
    expect(getNotesCount()).toBe(0)
    saveGameNote('g1', { sport: 'nba', homeTeam: 'A', awayTeam: 'B', preGame: '', postGame: '', tags: [] })
    saveGameNote('g2', { sport: 'nfl', homeTeam: 'C', awayTeam: 'D', preGame: '', postGame: '', tags: [] })
    expect(getNotesCount()).toBe(2)
  })

  it('returns null for unknown gameId', () => {
    expect(getGameNote('unknown')).toBeNull()
  })
})
