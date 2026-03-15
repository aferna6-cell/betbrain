'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ---------- Search item definitions ----------

type SearchItem = {
  label: string
  path: string
  category: 'Navigation' | 'Sports'
}

const ALL_ITEMS: SearchItem[] = [
  // Navigation
  { label: 'Dashboard', path: '/dashboard', category: 'Navigation' },
  { label: 'Smart Signals', path: '/dashboard/signals', category: 'Navigation' },
  { label: 'Alerts', path: '/dashboard/alerts', category: 'Navigation' },
  { label: 'Pick Tracker', path: '/dashboard/picks', category: 'Navigation' },
  { label: 'Daily Digest', path: '/dashboard/digest', category: 'Navigation' },
  { label: 'Prop Analyzer', path: '/dashboard/props', category: 'Navigation' },
  { label: 'Parlay Builder', path: '/dashboard/parlay', category: 'Navigation' },
  { label: 'Backtesting', path: '/dashboard/backtesting', category: 'Navigation' },
  { label: 'Leaderboard', path: '/dashboard/leaderboard', category: 'Navigation' },
  { label: 'API Access', path: '/dashboard/api', category: 'Navigation' },
  { label: 'Bankroll', path: '/dashboard/bankroll', category: 'Navigation' },
  { label: 'Watchlist', path: '/dashboard/watchlist', category: 'Navigation' },
  { label: 'Odds Tools', path: '/dashboard/tools', category: 'Navigation' },
  { label: 'Glossary', path: '/dashboard/glossary', category: 'Navigation' },
  { label: 'Billing', path: '/dashboard/billing', category: 'Navigation' },
  { label: 'Profile', path: '/dashboard/profile', category: 'Navigation' },
  // Sports
  { label: 'NBA Games', path: '/dashboard/league/nba', category: 'Sports' },
  { label: 'NFL Games', path: '/dashboard/league/nfl', category: 'Sports' },
  { label: 'MLB Games', path: '/dashboard/league/mlb', category: 'Sports' },
  { label: 'NHL Games', path: '/dashboard/league/nhl', category: 'Sports' },
]

const MAX_RESULTS = 10

// ---------- Highlight helper ----------

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>

  const lower = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lower.indexOf(lowerQuery)

  if (idx === -1) return <span>{text}</span>

  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-amber-400 font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

// ---------- Main component ----------

export function SearchPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const router = useRouter()

  // Filter items based on query
  const filtered = query.trim()
    ? ALL_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, MAX_RESULTS)
    : ALL_ITEMS.slice(0, MAX_RESULTS)

  // Group filtered results by category
  const categories = ['Navigation', 'Sports'] as const
  const grouped = categories
    .map((cat) => ({
      category: cat,
      items: filtered.filter((item) => item.category === cat),
    }))
    .filter((group) => group.items.length > 0)

  // Flat ordered list for keyboard navigation index tracking
  const flatItems = grouped.flatMap((g) => g.items)

  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const navigate = useCallback(
    (item: SearchItem) => {
      router.push(item.path)
      closePalette()
    },
    [router, closePalette]
  )

  // Cmd+K / Ctrl+K global listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => {
          if (prev) {
            // already open — close
            setQuery('')
            setActiveIndex(0)
            return false
          }
          setQuery('')
          setActiveIndex(0)
          return true
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      // slight delay so the DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector<HTMLLIElement>(
      '[data-active="true"]'
    )
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Keyboard navigation inside the palette (includes focus trap on Tab)
  function handlePaletteKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      closePalette()
      return
    }
    if (e.key === 'Tab') {
      // Trap focus within the dialog — only the input is focusable, so just prevent leaving
      e.preventDefault()
      inputRef.current?.focus()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev === 0 ? Math.max(flatItems.length - 1, 0) : prev - 1
      )
      return
    }
    if (e.key === 'Enter') {
      const item = flatItems[activeIndex]
      if (item) navigate(item)
      return
    }
  }

  if (!open) {
    return (
      <SearchTrigger onClick={openPalette} />
    )
  }

  return (
    <>
      <SearchTrigger onClick={openPalette} />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={closePalette}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
        onKeyDown={handlePaletteKeyDown}
      >
        <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          {/* Input row */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {/* Search icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-muted-foreground"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Search pages, features, sports"
              aria-expanded={flatItems.length > 0}
              aria-controls="search-listbox"
              aria-activedescendant={flatItems[activeIndex] ? `search-option-${activeIndex}` : undefined}
              aria-autocomplete="list"
              placeholder="Search pages, features, sports..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {/* Escape hint */}
            <kbd className="hidden shrink-0 items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:flex">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {flatItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <ul ref={listRef} id="search-listbox" role="listbox" className="py-2">
                {grouped.map((group) => {
                  // Track the global index offset for this group
                  const groupOffset = flatItems.indexOf(group.items[0])
                  return (
                    <li key={group.category} role="presentation">
                      {/* Category header */}
                      <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {group.category}
                      </div>
                      <ul>
                        {group.items.map((item, itemIdx) => {
                          const globalIdx = groupOffset + itemIdx
                          const isActive = globalIdx === activeIndex
                          return (
                            <li
                              key={item.path}
                              id={`search-option-${globalIdx}`}
                              role="option"
                              aria-selected={isActive}
                              data-active={isActive}
                              onClick={() => navigate(item)}
                              onMouseEnter={() => setActiveIndex(globalIdx)}
                              className={`mx-2 flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                                isActive
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-foreground hover:bg-muted'
                              }`}
                            >
                              <span className="font-medium">
                                <HighlightedText text={item.label} query={query} />
                              </span>
                              <span
                                className={`ml-4 shrink-0 font-mono text-xs ${
                                  isActive
                                    ? 'text-accent-foreground/60'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {item.path}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
                ↵
              </kbd>
              open
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
                Esc
              </kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Trigger button (search icon in nav) ----------

function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search (Ctrl+K)"
      className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span>Search</span>
      <kbd className="ml-1 hidden items-center rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground lg:flex">
        ⌘K
      </kbd>
    </button>
  )
}
