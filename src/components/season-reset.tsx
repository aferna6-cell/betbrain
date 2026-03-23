'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getSeasonResetDate,
  setSeasonResetDate,
  clearSeasonResetDate,
  SEASON_PRESETS,
} from '@/lib/seasonal-reset'

interface SeasonResetControlProps {
  onResetChange: (resetDate: string | null) => void
}

export function SeasonResetControl({ onResetChange }: SeasonResetControlProps) {
  const [resetDate, setResetDateState] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    const saved = getSeasonResetDate()
    setResetDateState(saved)
  }, [])

  function handleSetReset(date: string) {
    setSeasonResetDate(date)
    setResetDateState(date)
    onResetChange(date)
    setShowPicker(false)
  }

  function handleClearReset() {
    clearSeasonResetDate()
    setResetDateState(null)
    onResetChange(null)
    setShowPicker(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Season:</span>
          {resetDate ? (
            <Badge variant="secondary" className="text-xs">
              Since {new Date(resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">All-time</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowPicker(!showPicker)}
        >
          {showPicker ? 'Close' : 'Change'}
        </Button>
      </div>

      {showPicker && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Set a season boundary to see stats for the current season only. Historical picks are preserved.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SEASON_PRESETS.map((preset) => (
              <Button
                key={preset.resetDate}
                variant={resetDate === preset.resetDate ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleSetReset(preset.resetDate)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="date"
              className="h-7 rounded border border-border bg-background px-2 text-xs"
              value={resetDate ?? ''}
              onChange={(e) => {
                if (e.target.value) handleSetReset(e.target.value)
              }}
              aria-label="Custom season start date"
            />
            {resetDate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleClearReset}
              >
                Show All-Time
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
