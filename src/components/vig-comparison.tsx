'use client'

import { useState } from 'react'
import type { VigComparisonResult, BookVigProfile } from '@/lib/vig-comparison'
import { SPORT_LABELS } from '@/lib/sports/config'

function VigBadge({ classification }: { classification: BookVigProfile['classification'] }) {
  const styles: Record<string, string> = {
    'low-vig': 'bg-emerald-900/60 text-emerald-300',
    'average': 'bg-amber-900/60 text-amber-300',
    'high-vig': 'bg-red-900/60 text-red-300',
  }
  const labels: Record<string, string> = {
    'low-vig': 'Low Vig',
    'average': 'Average',
    'high-vig': 'High Vig',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[classification]}`}>
      {labels[classification]}
    </span>
  )
}

function VigBar({ vig, maxVig }: { vig: number; maxVig: number }) {
  const pct = maxVig > 0 ? (vig / maxVig) * 100 : 0
  const color = vig <= 3.5 ? 'bg-emerald-500' : vig <= 5.5 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function BookVigRow({ profile, maxVig, expanded, onToggle }: {
  profile: BookVigProfile; maxVig: number; expanded: boolean; onToggle: () => void
}) {
  return (
    <div className="border-b border-gray-800/50 last:border-0">
      <button onClick={onToggle} className="w-full text-left py-3 px-4 hover:bg-gray-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{profile.bookmaker}</span>
              <VigBadge classification={profile.classification} />
            </div>
            <div className="mt-1">
              <VigBar vig={profile.avgVig} maxVig={maxVig} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">{profile.avgVig.toFixed(2)}%</div>
            <div className="text-xs text-gray-500">{profile.marketsAnalyzed} markets</div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Moneyline</div>
              <div className="text-white font-medium">{profile.mlVig.toFixed(2)}%</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Spread</div>
              <div className="text-white font-medium">{profile.spreadVig.toFixed(2)}%</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Total</div>
              <div className="text-white font-medium">{profile.totalVig.toFixed(2)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Best Vig</div>
              <div className="text-emerald-400 font-medium">{profile.bestVig.toFixed(2)}%</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-gray-500 mb-1">Worst Vig</div>
              <div className="text-red-400 font-medium">{profile.worstVig.toFixed(2)}%</div>
            </div>
          </div>

          {Object.keys(profile.bySport).length > 0 && (
            <div className="text-xs">
              <div className="text-gray-500 mb-1">By Sport</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(profile.bySport).map(([sport, data]) => (
                  <span key={sport} className="bg-gray-800/50 rounded px-2 py-1">
                    <span className="text-gray-400">{SPORT_LABELS[sport] ?? sport}:</span>{' '}
                    <span className="text-white font-medium">{data.avgVig.toFixed(2)}%</span>
                    <span className="text-gray-600 ml-1">({data.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function VigComparisonPanel({ result }: { result: VigComparisonResult }) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null)

  if (result.profiles.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center">
        <p className="text-gray-500">No vig data available. Need at least one game with bookmaker odds.</p>
      </div>
    )
  }

  const maxVig = Math.max(...result.profiles.map(p => p.avgVig), 1)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Vig Comparison by Bookmaker</h3>
        <p className="text-sm text-gray-400">
          {result.gamesAnalyzed} games — Market avg: {result.marketAvgVig.toFixed(2)}% —{' '}
          {result.lowestVigBook && <span className="text-emerald-400">{result.lowestVigBook}</span>} has lowest juice
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/60 overflow-hidden">
        {result.profiles.map(profile => (
          <BookVigRow
            key={profile.bookmaker}
            profile={profile}
            maxVig={maxVig}
            expanded={expandedBook === profile.bookmaker}
            onToggle={() => setExpandedBook(expandedBook === profile.bookmaker ? null : profile.bookmaker)}
          />
        ))}
      </div>

      <p className="text-[10px] text-gray-600 italic">
        For informational purposes only. Not financial advice. Vig is calculated from current odds and varies by market.
      </p>
    </div>
  )
}
