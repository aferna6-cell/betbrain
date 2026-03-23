'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getGameNote,
  saveGameNote,
  deleteGameNote,
  type GameNote,
} from '@/lib/game-notes'

interface GameNotesProps {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
}

export function GameNotes({ gameId, sport, homeTeam, awayTeam }: GameNotesProps) {
  const [note, setNote] = useState<GameNote | null>(null)
  const [editing, setEditing] = useState(false)
  const [preGame, setPreGame] = useState('')
  const [postGame, setPostGame] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    const existing = getGameNote(gameId)
    if (existing) {
      setNote(existing)
      setPreGame(existing.preGame)
      setPostGame(existing.postGame)
      setTags(existing.tags)
    }
  }, [gameId])

  function handleSave() {
    const saved = saveGameNote(gameId, {
      sport,
      homeTeam,
      awayTeam,
      preGame,
      postGame,
      tags,
    })
    setNote(saved)
    setEditing(false)
  }

  function handleDelete() {
    if (!confirm('Delete notes for this game?')) return
    deleteGameNote(gameId)
    setNote(null)
    setPreGame('')
    setPostGame('')
    setTags([])
    setEditing(false)
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  if (!editing && !note) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">
          No notes for this game yet.
        </p>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Add Notes
        </Button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Pre-Game Thoughts</label>
          <textarea
            rows={3}
            placeholder="What are you thinking before this game? Key angles, leans, concerns..."
            value={preGame}
            onChange={(e) => setPreGame(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Post-Game Reflections</label>
          <textarea
            rows={3}
            placeholder="What happened? What did you learn? Were your reads correct?"
            value={postGame}
            onChange={(e) => setPostGame(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/20"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
              >
                {tag} &times;
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
              Add
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>Save Notes</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          {note && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Read-only view
  return (
    <div className="space-y-4">
      {note!.preGame && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Pre-Game Thoughts</p>
          <p className="text-sm whitespace-pre-wrap">{note!.preGame}</p>
        </div>
      )}

      {note!.postGame && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Post-Game Reflections</p>
          <p className="text-sm whitespace-pre-wrap">{note!.postGame}</p>
        </div>
      )}

      {note!.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note!.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit Notes
        </Button>
        <p className="text-[10px] text-muted-foreground self-center">
          Updated {new Date(note!.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
