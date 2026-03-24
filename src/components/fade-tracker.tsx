'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  buildFadeTrackerReport,
  type PickForFadeTracker,
} from '@/lib/fade-tracker'

export function FadeTrackerPanel() {
  const [picks, setPicks] = useState<PickForFadeTracker[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('betbrain-picks')
      if (raw) setPicks(JSON.parse(raw))
    } catch { /* empty */ }
  }, [])

  const report = useMemo(() => buildFadeTrackerReport(picks), [picks])

  if (report.totalFades + report.totalNonFades === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-2">Fade Tracker</h3>
        <p className="text-sm text-muted-foreground">
          Log resolved picks to see how your contrarian plays perform vs public-side bets.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Fade Tracker</h3>
        <p className="text-sm text-muted-foreground">
          How do contrarian (underdog) plays compare to public-side favorites?
        </p>
      </div>

      {/* Fade vs Public comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="text-xs text-muted-foreground mb-1">Fades (Contrarian)</div>
          <div className="text-2xl font-bold text-amber-400">
            {report.fadeWins}W-{report.fadeLosses}L
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {report.fadeWinRate !== null ? `${report.fadeWinRate}% win rate` : 'No fades'}
          </div>
          <div className={`text-sm font-mono mt-1 ${report.fadeROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {report.fadeROI >= 0 ? '+' : ''}{report.fadeROI}% ROI ({report.fadeProfitUnits >= 0 ? '+' : ''}{report.fadeProfitUnits}u)
          </div>
        </div>

        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="text-xs text-muted-foreground mb-1">Public Side</div>
          <div className="text-2xl font-bold text-blue-400">
            {report.nonFadeWins}W-{report.nonFadeLosses}L
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {report.nonFadeWinRate !== null ? `${report.nonFadeWinRate}% win rate` : 'No public picks'}
          </div>
          <div className={`text-sm font-mono mt-1 ${report.nonFadeROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {report.nonFadeROI >= 0 ? '+' : ''}{report.nonFadeROI}% ROI ({report.nonFadeProfitUnits >= 0 ? '+' : ''}{report.nonFadeProfitUnits}u)
          </div>
        </div>
      </div>

      {/* Fade edge */}
      <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
        <span className="text-sm">Fade Edge</span>
        <span className={`text-lg font-bold font-mono ${report.fadeEdge > 0 ? 'text-green-400' : report.fadeEdge < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
          {report.fadeEdge > 0 ? '+' : ''}{report.fadeEdge}%
        </span>
      </div>

      {/* By sport */}
      {report.bySport.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">By Sport</div>
          <div className="space-y-1">
            {report.bySport.map((sport) => (
              <div key={sport.sport} className="flex items-center gap-3 text-xs">
                <span className="w-10 uppercase font-medium">{sport.sport}</span>
                <div className="flex-1 flex gap-4">
                  <span className="text-amber-400">
                    Fade: {sport.fadeWinRate !== null ? `${sport.fadeWinRate}%` : '-'} ({sport.fadeCount})
                  </span>
                  <span className="text-blue-400">
                    Public: {sport.nonFadeWinRate !== null ? `${sport.nonFadeWinRate}%` : '-'} ({sport.nonFadeCount})
                  </span>
                </div>
                <span className={`font-mono ${sport.fadeROI > sport.nonFadeROI ? 'text-green-400' : 'text-red-400'}`}>
                  {sport.fadeROI > sport.nonFadeROI ? 'Fade +' : 'Public +'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm">{report.insight}</p>
      </div>

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Not financial advice. Fade classification is estimated from odds.
      </p>
    </div>
  )
}
