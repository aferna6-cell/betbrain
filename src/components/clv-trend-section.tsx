'use client'

import { useState, useEffect, useCallback } from 'react'
import { CLVTrendChart } from '@/components/clv-trend-chart'

interface Pick {
  id: string
  odds: number
  closing_odds: number | null
  units: number
  game_date: string
  outcome?: string | null
}

export function CLVTrendSection() {
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPicks = useCallback(async () => {
    try {
      const res = await fetch('/api/picks')
      if (!res.ok) return
      const data = await res.json()
      setPicks(data.picks ?? [])
    } catch {
      // Silent — non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPicks()
  }, [fetchPicks])

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted mb-3" />
        <div className="h-48 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  return <CLVTrendChart picks={picks} />
}
