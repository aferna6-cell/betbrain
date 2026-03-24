'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getAllTags,
  getPickTags,
  addTagToPick,
  removeTagFromPick,
  setPickTags,
  calcTagPerformance,
  getTagExtremes,
  suggestTags,
  getTagColor,
  addCustomTag,
  getTagsInUse,
  getTagCoOccurrence,
  type TagPerformance,
  type PickTagAssignment,
} from '@/lib/pick-tags'

interface PickForTags {
  id: string
  outcome: string | null
  profit: number | null
  units: number
  odds: number
  pick_team?: string | null
  sport?: string
  notes?: string | null
}

/** Inline tag badges for a single pick — used in pick list rows */
export function PickTagBadges({
  pickId,
  onTagsChange,
}: {
  pickId: string
  onTagsChange?: () => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setTags(getPickTags(pickId))
  }, [pickId])

  const allTags = useMemo(() => getAllTags(), [])

  const filtered = useMemo(() => {
    if (!search) return allTags.filter((t) => !tags.includes(t)).slice(0, 8)
    return allTags
      .filter((t) => t.includes(search.toLowerCase()) && !tags.includes(t))
      .slice(0, 8)
  }, [allTags, tags, search])

  const handleAdd = useCallback(
    (tag: string) => {
      const updated = addTagToPick(pickId, tag)
      setTags(updated)
      setSearch('')
      setShowAdd(false)
      onTagsChange?.()
    },
    [pickId, onTagsChange]
  )

  const handleRemove = useCallback(
    (tag: string) => {
      const updated = removeTagFromPick(pickId, tag)
      setTags(updated)
      onTagsChange?.()
    },
    [pickId, onTagsChange]
  )

  const handleCustomAdd = useCallback(() => {
    if (!search.trim()) return
    const normalized = addCustomTag(search)
    if (normalized) {
      handleAdd(normalized)
    }
  }, [search, handleAdd])

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${getTagColor(tag)}20`,
            color: getTagColor(tag),
            border: `1px solid ${getTagColor(tag)}40`,
          }}
        >
          {tag}
          <button
            onClick={() => handleRemove(tag)}
            className="hover:text-white ml-0.5 text-[10px]"
            aria-label={`Remove tag ${tag}`}
          >
            x
          </button>
        </span>
      ))}

      {showAdd ? (
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (filtered.length > 0) handleAdd(filtered[0])
                else handleCustomAdd()
              }
              if (e.key === 'Escape') {
                setShowAdd(false)
                setSearch('')
              }
            }}
            placeholder="Add tag..."
            className="w-28 px-2 py-0.5 text-xs rounded border border-border bg-background"
            autoFocus
          />
          {(filtered.length > 0 || search.trim()) && (
            <div className="absolute z-20 mt-1 w-48 rounded border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
              {filtered.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleAdd(tag)}
                  className="flex items-center gap-2 w-full px-2 py-1 text-xs text-left hover:bg-muted"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getTagColor(tag) }}
                  />
                  {tag}
                </button>
              ))}
              {search.trim() && !allTags.includes(search.trim().toLowerCase()) && (
                <button
                  onClick={handleCustomAdd}
                  className="w-full px-2 py-1 text-xs text-left hover:bg-muted text-blue-400"
                >
                  + Create &quot;{search.trim()}&quot;
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-muted-foreground hover:text-foreground px-1"
          aria-label="Add tag"
        >
          + tag
        </button>
      )}
    </div>
  )
}

/** Tag suggestion chips for a pick */
export function PickTagSuggestions({
  pick,
  onApply,
}: {
  pick: PickForTags
  onApply?: () => void
}) {
  const suggestions = useMemo(() => suggestTags(pick), [pick])
  const [applied, setApplied] = useState<Set<string>>(new Set())

  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Suggestions:</span>
      {suggestions
        .filter((s) => !applied.has(s.tag))
        .map((s) => (
          <button
            key={s.tag}
            onClick={() => {
              addTagToPick(pick.id, s.tag)
              setApplied(new Set([...applied, s.tag]))
              onApply?.()
            }}
            className="px-2 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground/40 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            title={s.reason}
          >
            + {s.tag}
          </button>
        ))}
    </div>
  )
}

/** Full tag performance dashboard panel */
export function TagPerformancePanel() {
  const [picks, setPicks] = useState<PickForTags[]>([])
  const [performances, setPerformances] = useState<TagPerformance[]>([])
  const [sortBy, setSortBy] = useState<'roi' | 'winRate' | 'profit' | 'total'>('roi')
  const [filterTag, setFilterTag] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) {
        const parsed = JSON.parse(raw) as PickForTags[]
        setPicks(parsed)
        setPerformances(calcTagPerformance(parsed))
      }
    } catch {
      /* empty */
    }
  }, [])

  const sorted = useMemo(() => {
    const list = [...performances]
    switch (sortBy) {
      case 'roi':
        return list.sort((a, b) => b.roi - a.roi)
      case 'winRate':
        return list.sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1))
      case 'profit':
        return list.sort((a, b) => b.profit - a.profit)
      case 'total':
        return list.sort((a, b) => b.total - a.total)
    }
  }, [performances, sortBy])

  const extremes = useMemo(() => getTagExtremes(performances), [performances])
  const tagsInUse = useMemo(() => getTagsInUse(), [])
  const coOccurrence = useMemo(() => getTagCoOccurrence(), [])

  if (performances.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Tag Performance</h3>
        <p className="text-sm text-muted-foreground">
          Tag your picks to track performance by category. Use tags like
          &quot;value&quot;, &quot;revenge game&quot;, or &quot;prime time&quot;
          to discover what types of bets work best for you.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tag Performance</h3>
        <span className="text-xs text-muted-foreground">
          {tagsInUse.length} tags in use
        </span>
      </div>

      {/* Extremes */}
      {(extremes.best || extremes.worst) && (
        <div className="grid grid-cols-2 gap-3">
          {extremes.best && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <div className="text-xs text-green-400 mb-1">Best Tag</div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${getTagColor(extremes.best.tag)}20`,
                    color: getTagColor(extremes.best.tag),
                  }}
                >
                  {extremes.best.tag}
                </span>
                <span className="text-sm font-bold text-green-400">
                  {extremes.best.roi > 0 ? '+' : ''}
                  {extremes.best.roi.toFixed(1)}% ROI
                </span>
              </div>
            </div>
          )}
          {extremes.worst && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <div className="text-xs text-red-400 mb-1">Worst Tag</div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${getTagColor(extremes.worst.tag)}20`,
                    color: getTagColor(extremes.worst.tag),
                  }}
                >
                  {extremes.worst.tag}
                </span>
                <span className="text-sm font-bold text-red-400">
                  {extremes.worst.roi > 0 ? '+' : ''}
                  {extremes.worst.roi.toFixed(1)}% ROI
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort controls */}
      <div className="flex gap-2">
        {(['roi', 'winRate', 'profit', 'total'] as const).map((col) => (
          <button
            key={col}
            onClick={() => setSortBy(col)}
            className={`px-2 py-1 text-xs rounded ${
              sortBy === col
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {col === 'winRate' ? 'Win Rate' : col === 'roi' ? 'ROI' : col === 'profit' ? 'Profit' : 'Volume'}
          </button>
        ))}
      </div>

      {/* Performance table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left pb-2 font-medium">Tag</th>
              <th className="text-right pb-2 font-medium">W-L-P</th>
              <th className="text-right pb-2 font-medium">Win %</th>
              <th className="text-right pb-2 font-medium">Profit</th>
              <th className="text-right pb-2 font-medium">ROI</th>
              <th className="text-right pb-2 font-medium">Avg Odds</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr
                key={p.tag}
                className={`border-b border-border/50 ${
                  filterTag === p.tag ? 'bg-blue-500/10' : ''
                }`}
                onClick={() => setFilterTag(filterTag === p.tag ? null : p.tag)}
              >
                <td className="py-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: `${getTagColor(p.tag)}20`,
                      color: getTagColor(p.tag),
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getTagColor(p.tag) }}
                    />
                    {p.tag}
                  </span>
                </td>
                <td className="text-right py-2 font-mono text-xs">
                  {p.wins}-{p.losses}-{p.pushes}
                  {p.pending > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({p.pending}p)
                    </span>
                  )}
                </td>
                <td className="text-right py-2">
                  {p.winRate != null ? (
                    <span
                      className={
                        p.winRate >= 55
                          ? 'text-green-400'
                          : p.winRate < 45
                            ? 'text-red-400'
                            : 'text-foreground'
                      }
                    >
                      {p.winRate.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </td>
                <td className="text-right py-2 font-mono text-xs">
                  <span
                    className={
                      p.profit > 0
                        ? 'text-green-400'
                        : p.profit < 0
                          ? 'text-red-400'
                          : 'text-foreground'
                    }
                  >
                    {p.profit > 0 ? '+' : ''}
                    {p.profit.toFixed(0)}u
                  </span>
                </td>
                <td className="text-right py-2 font-mono text-xs">
                  <span
                    className={
                      p.roi > 0
                        ? 'text-green-400'
                        : p.roi < 0
                          ? 'text-red-400'
                          : 'text-foreground'
                    }
                  >
                    {p.roi > 0 ? '+' : ''}
                    {p.roi.toFixed(1)}%
                  </span>
                </td>
                <td className="text-right py-2 font-mono text-xs">
                  {p.avgOdds != null ? (
                    p.avgOdds > 0 ? `+${Math.round(p.avgOdds)}` : Math.round(p.avgOdds)
                  ) : (
                    '--'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Co-occurrence */}
      {coOccurrence.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Frequently paired tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {coOccurrence.slice(0, 5).map((pair, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50 text-xs"
              >
                <span style={{ color: getTagColor(pair.tagA) }}>
                  {pair.tagA}
                </span>
                <span className="text-muted-foreground">+</span>
                <span style={{ color: getTagColor(pair.tagB) }}>
                  {pair.tagB}
                </span>
                <span className="text-muted-foreground ml-1">
                  ({pair.count}x)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
