'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { formatOdds } from '@/lib/odds'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { RLMScanResult, RLMAlert, RLMStrength } from '@/lib/rlm-alerts'

const STRENGTH_STYLES: Record<RLMStrength, string> = {
  strong: 'bg-red-900/60 text-red-300 border-red-800',
  moderate: 'bg-amber-900/60 text-amber-300 border-amber-800',
  weak: 'bg-gray-800 text-gray-400 border-gray-700',
}

function RLMCard({ alert }: { alert: RLMAlert }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${STRENGTH_STYLES[alert.strength]}`}>
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/games/${alert.game.id}`}
            className="font-medium text-white hover:text-blue-400 text-sm"
          >
            {alert.game.awayTeam} @ {alert.game.homeTeam}
          </Link>
          <div className="flex gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">
              {SPORT_LABELS[alert.game.sport as keyof typeof SPORT_LABELS] ?? alert.game.sport}
            </Badge>
            <span className="text-xs text-gray-500">{formatGameTime(alert.game.commenceTime)}</span>
          </div>
        </div>
        <div className="text-right">
          <Badge
            variant="outline"
            className={`text-xs capitalize ${
              alert.strength === 'strong' ? 'border-red-500 text-red-400' :
              alert.strength === 'moderate' ? 'border-amber-500 text-amber-400' :
              'border-gray-600 text-gray-400'
            }`}
          >
            {alert.strength}
          </Badge>
          <div className="text-xs text-gray-500 mt-1">{alert.confidence}% conf</div>
        </div>
      </div>

      <p className="text-sm text-gray-300">{alert.description}</p>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-black/20 rounded p-2">
          <div className="text-xs text-gray-500">Sharp Side</div>
          <div className="text-sm font-medium text-green-400">{alert.sharpTeam}</div>
          {alert.bestSharpOdds != null && (
            <div className="text-xs text-gray-400 mt-0.5">
              Best: {formatOdds(alert.bestSharpOdds)} ({alert.bestSharpBook})
            </div>
          )}
        </div>
        <div className="bg-black/20 rounded p-2">
          <div className="text-xs text-gray-500">Public Side</div>
          <div className="text-sm font-medium text-red-400">{alert.publicTeam}</div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        {expanded ? 'Hide' : 'Show'} {alert.factors.length} factors
      </button>

      {expanded && (
        <div className="space-y-1 mt-1">
          {alert.factors.map((f, i) => (
            <div key={i} className="text-xs text-gray-400 flex items-start gap-1">
              <span className="text-blue-500 mt-0.5">&#8226;</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RLMAlertsPanel({ result }: { result: RLMScanResult }) {
  if (result.alerts.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center">
        <p className="text-sm text-gray-400">
          No reverse line movement detected across {result.gamesScanned} games.
          RLM signals appear when the line moves against expected public action.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          For informational purposes only. Not financial advice.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">RLM Signals</div>
          <div className="text-lg font-bold text-white">{result.alerts.length}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Strong</div>
          <div className="text-lg font-bold text-red-400">{result.strongCount}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-center">
          <div className="text-xs text-gray-500">Moderate</div>
          <div className="text-lg font-bold text-amber-400">{result.moderateCount}</div>
        </div>
      </div>

      <div className="space-y-2">
        {result.alerts.map((alert, i) => (
          <RLMCard key={`${alert.game.id}-${alert.sharpSide}-${i}`} alert={alert} />
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        For informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
