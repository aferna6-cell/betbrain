'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAllEntries,
  getEntryByDate,
  createEntry,
  updateEntry,
  deleteEntry,
  calculateJournalStats,
  exportJournalToCSV,
  MOOD_EMOJI,
  MOOD_COLORS,
  SUGGESTED_TAGS,
  type JournalEntry,
  type JournalMood,
  type JournalStats,
} from '@/lib/journal'

// ---------------------------------------------------------------------------
// Mood selector
// ---------------------------------------------------------------------------

function MoodPicker({
  selected,
  onChange,
}: {
  selected: JournalMood
  onChange: (m: JournalMood) => void
}) {
  const moods: JournalMood[] = ['terrible', 'bad', 'neutral', 'good', 'great']
  return (
    <div className="flex gap-2">
      {moods.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors ${
            selected === m
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/30'
          }`}
        >
          <span className="text-lg">{MOOD_EMOJI[m]}</span>
          <span className="text-xs capitalize mt-0.5">{m}</span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tag input
// ---------------------------------------------------------------------------

function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
    }
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer hover:bg-destructive/20"
            onClick={() => removeTag(tag)}
          >
            {tag} &times;
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add tag..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(input)
            }
          }}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => addTag(input)}
          disabled={!input.trim()}
        >
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {SUGGESTED_TAGS.filter((t) => !tags.includes(t))
          .slice(0, 8)
          .map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            >
              + {tag}
            </button>
          ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Entry form
// ---------------------------------------------------------------------------

interface EntryFormData {
  date: string
  title: string
  mood: JournalMood
  bankroll: string
  notes: string
  lessons: string[]
  tags: string[]
}

function EntryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: JournalEntry | null
  onSave: (data: EntryFormData) => void
  onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<EntryFormData>({
    date: initial?.date ?? today,
    title: initial?.title ?? '',
    mood: initial?.mood ?? 'neutral',
    bankroll: initial?.bankroll?.toString() ?? '',
    notes: initial?.notes ?? '',
    lessons: initial?.lessons ?? [''],
    tags: initial?.tags ?? [],
  })

  function setField<K extends keyof EntryFormData>(key: K, value: EntryFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addLesson() {
    setField('lessons', [...form.lessons, ''])
  }

  function updateLesson(idx: number, value: string) {
    const next = [...form.lessons]
    next[idx] = value
    setField('lessons', next)
  }

  function removeLesson(idx: number) {
    setField('lessons', form.lessons.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-5">
      {/* Date + Title */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Bankroll Snapshot ($)</label>
          <input
            type="number"
            placeholder="e.g. 1000"
            value={form.bankroll}
            onChange={(e) => setField('bankroll', e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Title</label>
        <input
          type="text"
          placeholder="e.g. Great NBA night — hit 4/5 picks"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Mood */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">How are you feeling?</label>
        <MoodPicker selected={form.mood} onChange={(m) => setField('mood', m)} />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <textarea
          rows={5}
          placeholder="What happened today? What did you learn? Any patterns you noticed?"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      {/* Lessons */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Key Takeaways
        </label>
        <div className="space-y-2">
          {form.lessons.map((lesson, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                placeholder={`Lesson ${idx + 1}`}
                value={lesson}
                onChange={(e) => updateLesson(idx, e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {form.lessons.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeLesson(idx)}>
                  &times;
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLesson}>
            + Add Takeaway
          </Button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Tags</label>
        <TagInput tags={form.tags} onChange={(t) => setField('tags', t)} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)}>
          {initial ? 'Update Entry' : 'Save Entry'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Entry card
// ---------------------------------------------------------------------------

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" title={entry.mood}>
            {MOOD_EMOJI[entry.mood]}
          </span>
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-semibold hover:text-primary transition-colors text-left"
            >
              {entry.title || entry.date}
            </button>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {entry.bankroll !== null && (
                <span className="ml-2 font-mono">
                  ${entry.bankroll.toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          {entry.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}
          {entry.lessons.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Takeaways</p>
              <ul className="list-disc list-inside space-y-0.5">
                {entry.lessons
                  .filter(Boolean)
                  .map((l, i) => (
                    <li key={i} className="text-sm">
                      {l}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats panel
// ---------------------------------------------------------------------------

function StatsPanel({ stats }: { stats: JournalStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Total Entries</p>
        <p className="text-2xl font-bold">{stats.totalEntries}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Current Streak</p>
        <p className="text-2xl font-bold">
          {stats.currentStreak}
          <span className="text-sm font-normal text-muted-foreground"> days</span>
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Avg Bankroll</p>
        <p className="text-2xl font-bold font-mono">
          {stats.avgBankroll !== null
            ? `$${Math.round(stats.avgBankroll).toLocaleString()}`
            : '--'}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Total Lessons</p>
        <p className="text-2xl font-bold">{stats.lessonsCount}</p>
      </div>

      {/* Mood breakdown */}
      <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Mood Distribution</p>
        <div className="flex gap-4 flex-wrap">
          {(['great', 'good', 'neutral', 'bad', 'terrible'] as JournalMood[]).map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <span>{MOOD_EMOJI[m]}</span>
              <span className={`text-sm font-medium ${MOOD_COLORS[m]}`}>
                {stats.moodDistribution[m]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top tags */}
      {stats.topTags.length > 0 && (
        <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Most Used Tags</p>
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(({ tag, count }) => (
              <Badge key={tag} variant="secondary">
                {tag} ({count})
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type View = 'list' | 'new' | 'edit'

export function BettingJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [view, setView] = useState<View>('list')
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [filterTag, setFilterTag] = useState<string | null>(null)

  const refresh = useCallback(() => {
    const all = getAllEntries()
    setEntries(all)
    setStats(calculateJournalStats(all))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleSave(data: EntryFormData) {
    const bankroll = data.bankroll ? parseFloat(data.bankroll) : null
    const lessons = data.lessons.filter(Boolean)

    if (editingEntry) {
      updateEntry(editingEntry.id, {
        date: data.date,
        title: data.title,
        mood: data.mood,
        bankroll: isNaN(bankroll as number) ? null : bankroll,
        notes: data.notes,
        lessons,
        tags: data.tags,
      })
    } else {
      // Check if entry already exists for this date
      const existing = getEntryByDate(data.date)
      if (existing) {
        if (!confirm(`An entry already exists for ${data.date}. Do you want to create another?`)) {
          return
        }
      }
      createEntry({
        date: data.date,
        title: data.title,
        mood: data.mood,
        bankroll: isNaN(bankroll as number) ? null : bankroll,
        notes: data.notes,
        lessons,
        tags: data.tags,
      })
    }
    setView('list')
    setEditingEntry(null)
    refresh()
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this journal entry?')) return
    deleteEntry(id)
    refresh()
  }

  function handleExport() {
    const csv = exportJournalToCSV(entries)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `betbrain-journal-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredEntries = filterTag
    ? entries.filter((e) => e.tags.includes(filterTag))
    : entries

  if (view === 'new' || view === 'edit') {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">
          {view === 'edit' ? 'Edit Entry' : 'New Journal Entry'}
        </h2>
        <EntryForm
          initial={editingEntry}
          onSave={handleSave}
          onCancel={() => {
            setView('list')
            setEditingEntry(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button onClick={() => setView('new')}>+ New Entry</Button>
          <Button
            variant="outline"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide Stats' : 'Stats'}
          </Button>
        </div>
        <div className="flex gap-2">
          {filterTag && (
            <Button variant="ghost" size="sm" onClick={() => setFilterTag(null)}>
              Clear filter: {filterTag} &times;
            </Button>
          )}
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && stats && <StatsPanel stats={stats} />}

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {entries.length === 0
              ? 'No journal entries yet. Start documenting your betting journey.'
              : 'No entries match the selected filter.'}
          </p>
          {entries.length === 0 && (
            <Button className="mt-4" onClick={() => setView('new')}>
              Write First Entry
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => {
                setEditingEntry(entry)
                setView('edit')
              }}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
