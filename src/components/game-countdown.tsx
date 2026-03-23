'use client'

import { useState, useEffect } from 'react'

interface GameCountdownProps {
  commenceTime: string
  className?: string
}

/**
 * Live countdown timer for upcoming games.
 * Shows "Xh Ym" for games starting within 24 hours.
 * Updates every minute.
 */
export function GameCountdown({ commenceTime, className = '' }: GameCountdownProps) {
  const [remaining, setRemaining] = useState<string | null>(null)
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function update() {
      const now = Date.now()
      const start = new Date(commenceTime).getTime()
      const diff = start - now

      if (diff <= 0) {
        setRemaining('LIVE')
        setUrgent(true)
        return
      }

      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)

      if (hours >= 24) {
        setRemaining(null) // Don't show countdown for games > 24h away
        return
      }

      if (hours > 0) {
        setRemaining(`${hours}h ${minutes}m`)
      } else {
        setRemaining(`${minutes}m`)
      }

      setUrgent(hours === 0 && minutes <= 30)
    }

    update()
    const interval = setInterval(update, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [commenceTime])

  if (!remaining) return null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        remaining === 'LIVE'
          ? 'bg-red-500/20 text-red-400 animate-pulse'
          : urgent
            ? 'bg-orange-500/20 text-orange-400'
            : 'bg-blue-500/15 text-blue-400'
      } ${className}`}
    >
      {remaining === 'LIVE' ? (
        <>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          LIVE
        </>
      ) : (
        remaining
      )}
    </span>
  )
}
