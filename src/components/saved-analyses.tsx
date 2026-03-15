'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'
import { RISK_COLORS, formatDateShort } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { RiskLevel, Sport } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiInsightRow {
  id: string
  external_game_id: string
  sport: Sport
  summary: string
  key_factors: unknown[]
  value_assessment: Record<string, unknown>
  risk_level: RiskLevel
  confidence: number
  disclaimer: string
  expires_at: string
  created_at: string
}

interface SavedAnalysisRow {
  id: string
  user_id: string
  insight_id: string
  notes: string | null
  created_at: string
  ai_insights: AiInsightRow | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  low: 'border-green-500/40 text-green-500',
  medium: 'border-yellow-500/40 text-yellow-500',
  high: 'border-red-500/40 text-red-500',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getValueSide(valueAssessment: Record<string, unknown>): string {
  const side = valueAssessment?.side
  if (side === 'home') return 'Home value'
  if (side === 'away') return 'Away value'
  return 'No clear value'
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SavedAnalysesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-10 animate-pulse rounded bg-muted" />
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Note editor
// ---------------------------------------------------------------------------

function NoteEditor({
  savedId,
  initialNote,
  onSaved,
}: {
  savedId: string
  initialNote: string | null
  onSaved: (note: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // PATCH is not implemented on the route, so we use a workaround:
      // delete the old record and re-insert with the note would break the ID.
      // Instead we use a dedicated PATCH approach via a separate fetch.
      const res = await fetch(`/api/saved-analyses?id=${encodeURIComponent(savedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value.trim() || null }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save note')
        return
      }
      onSaved(value.trim() || null)
      setEditing(false)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 mt-2">
        {initialNote ? (
          <p className="text-sm text-muted-foreground italic">
            &ldquo;{initialNote}&rdquo;
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
        >
          {initialNote ? 'Edit note' : 'Add note'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a personal note..."
        maxLength={280}
        className="w-full h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setValue(initialNote ?? '')
            setEditing(false)
            setError(null)
          }}
          className="h-7 text-xs"
        >
          Cancel
        </Button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single card
// ---------------------------------------------------------------------------

function SavedAnalysisCard({
  item,
  onRemove,
  onRemoveError,
  onNoteUpdated,
}: {
  item: SavedAnalysisRow
  onRemove: (id: string) => void
  onRemoveError: () => void
  onNoteUpdated: (id: string, note: string | null) => void
}) {
  const [removing, setRemoving] = useState(false)
  const insight = item.ai_insights

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch(
        `/api/saved-analyses?id=${encodeURIComponent(item.id)}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        onRemove(item.id)
      } else {
        onRemoveError()
      }
    } catch {
      onRemoveError()
    } finally {
      setRemoving(false)
    }
  }

  if (!insight) {
    // The joined insight was deleted — still show the card with limited info
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Analysis data no longer available
            </p>
            <p className="text-xs text-muted-foreground">
              Saved {formatDateShort(item.created_at)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={removing}
            className="h-8 text-xs shrink-0"
          >
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold uppercase shrink-0">
              {SPORT_LABELS[insight.sport] ?? insight.sport.toUpperCase()}
            </Badge>
            <span className="text-sm font-medium truncate">
              Game {insight.external_game_id.slice(0, 8)}…
            </span>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              Confidence: {insight.confidence}%
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${RISK_BADGE_CLASSES[insight.risk_level]}`}
            >
              Risk:{' '}
              <span className={`ml-1 ${RISK_COLORS[insight.risk_level]}`}>
                {insight.risk_level.toUpperCase()}
              </span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {getValueSide(insight.value_assessment)}
            </span>
            <span className="text-xs text-muted-foreground">
              Saved {formatDateShort(item.created_at)}
            </span>
          </div>

          {/* Summary */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {insight.summary}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/dashboard/games/${insight.external_game_id}`}>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              View
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={removing}
            className="h-8 text-xs hover:border-red-500/50 hover:text-red-500"
          >
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      </div>

      {/* Note editor */}
      <NoteEditor
        savedId={item.id}
        initialNote={item.notes}
        onSaved={(note) => onNoteUpdated(item.id, note)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SavedAnalyses() {
  const [items, setItems] = useState<SavedAnalysisRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  const fetchSaved = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/saved-analyses')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load saved analyses')
        return
      }
      setItems(data.savedAnalyses ?? [])
    } catch {
      setError('Network error — please refresh')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
    addToast('Analysis removed', 'success')
  }

  function handleRemoveError() {
    addToast('Failed to remove analysis', 'error')
  }

  function handleNoteUpdated(id: string, note: string | null) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: note } : item))
    )
  }

  if (loading) {
    return <SavedAnalysesSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSaved}
          className="mt-3 text-xs"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium">No saved analyses yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bookmark analyses from game detail pages.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="outline" size="sm" className="text-xs">
            Browse Games
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SavedAnalysisCard
          key={item.id}
          item={item}
          onRemove={handleRemove}
          onRemoveError={handleRemoveError}
          onNoteUpdated={handleNoteUpdated}
        />
      ))}
    </div>
  )
}
