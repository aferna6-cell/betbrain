'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatGameTime } from '@/lib/format'
import { formatBriefAsText } from '@/lib/morning-brief'
import type { MorningBrief, MorningBriefPlay, CautionAlert, DailyChecklist, SportQuickTake } from '@/lib/morning-brief'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlayCard({ play, rank }: { play: MorningBriefPlay; rank: number }) {
  const strengthColor =
    play.signalStrength >= 60 ? 'text-green-500' :
    play.signalStrength >= 30 ? 'text-yellow-500' :
    'text-muted-foreground'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {play.sportLabel}
          </Badge>
          <span className={`text-xs font-bold ${strengthColor}`}>
            Signal: {play.signalStrength}/100
          </span>
          {play.bestEV !== null && (
            <Badge className="bg-green-500/20 text-green-500 text-xs">
              +{play.bestEV.toFixed(1)}% EV
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatGameTime(play.commenceTime)}
          </span>
        </div>
        <p className="text-sm font-medium">
          {play.awayTeam} @ {play.homeTeam}
        </p>
        {play.edge.side !== 'none' && (
          <p className="text-xs text-primary mt-0.5">{play.edge.description}</p>
        )}
        {play.gameFlow && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Game flow: {play.gameFlow}
          </p>
        )}
        {play.reasons.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {play.reasons.slice(0, 3).map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground">&bull; {r}</p>
            ))}
          </div>
        )}
        <Link
          href={`/dashboard/games/${play.gameId}`}
          className="mt-1 inline-block text-xs text-primary hover:underline"
        >
          View Analysis &rarr;
        </Link>
      </div>
    </div>
  )
}

function CautionCard({ alert }: { alert: CautionAlert }) {
  const styles = {
    danger: 'border-red-500/50 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  }
  const icons = { danger: '!!!', warning: '!!', info: 'i' }

  return (
    <div className={`rounded-lg border p-3 ${styles[alert.severity]}`}>
      <div className="flex items-start gap-2">
        <span className="text-xs font-bold">[{icons[alert.severity]}]</span>
        <p className="text-sm">{alert.message}</p>
      </div>
    </div>
  )
}

function ChecklistItem({ item }: { item: DailyChecklist }) {
  const [checked, setChecked] = useState(false)
  const priorityColor =
    item.priority === 'high' ? 'text-red-400' :
    item.priority === 'medium' ? 'text-yellow-400' :
    'text-muted-foreground'

  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
        className="mt-0.5 rounded border-border"
      />
      <span className={`text-sm ${checked ? 'line-through text-muted-foreground' : ''}`}>
        {item.item}
      </span>
      <span className={`text-xs ml-auto ${priorityColor}`}>{item.priority}</span>
    </label>
  )
}

function SportTakeRow({ take }: { take: SportQuickTake }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {take.label}
        </Badge>
        <span className="text-sm">{take.headline}</span>
      </div>
      <span className="text-xs text-muted-foreground">{take.gameCount} game{take.gameCount !== 1 ? 's' : ''}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MorningBriefCard({ brief }: { brief: MorningBrief }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const verdictColor =
    brief.slateVerdict === 'loaded' ? 'text-green-500' :
    brief.slateVerdict === 'solid' ? 'text-blue-500' :
    brief.slateVerdict === 'average' ? 'text-yellow-500' :
    brief.slateVerdict === 'light' ? 'text-orange-500' :
    'text-muted-foreground'

  function handleCopy() {
    const text = formatBriefAsText(brief)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (brief.totalGames === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-1">Morning Brief</h3>
        <p className="text-sm text-muted-foreground">{brief.headline}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Morning Brief</h3>
            <span className="text-xs text-muted-foreground">{brief.date}</span>
          </div>
          <p className="text-sm text-foreground mt-1">{brief.headline}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className={`text-lg font-bold ${verdictColor}`}>
            {brief.slateVerdict === 'loaded' ? 'Loaded' :
             brief.slateVerdict === 'solid' ? 'Solid' :
             brief.slateVerdict === 'average' ? 'Average' :
             brief.slateVerdict === 'light' ? 'Light' : 'Empty'}
          </p>
          <p className="text-xs text-muted-foreground">
            {brief.totalGames} games / {brief.activeSports} sport{brief.activeSports !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded bg-background p-2 text-center">
          <p className="text-lg font-bold text-green-500">{brief.stats.totalEVOpps}</p>
          <p className="text-xs text-muted-foreground">+EV Spots</p>
        </div>
        <div className="rounded bg-background p-2 text-center">
          <p className="text-lg font-bold">{brief.stats.avgSignalStrength}</p>
          <p className="text-xs text-muted-foreground">Avg Signal</p>
        </div>
        <div className="rounded bg-background p-2 text-center">
          <p className="text-lg font-bold text-purple-400">{brief.stats.otCandidates}</p>
          <p className="text-xs text-muted-foreground">OT Cands</p>
        </div>
        <div className="rounded bg-background p-2 text-center">
          <p className="text-lg font-bold text-yellow-400">{brief.stats.closeGames}</p>
          <p className="text-xs text-muted-foreground">Close Games</p>
        </div>
      </div>

      {/* Caution alerts */}
      {brief.cautionAlerts.length > 0 && (
        <div className="space-y-2">
          {brief.cautionAlerts.map((alert, i) => (
            <CautionCard key={i} alert={alert} />
          ))}
        </div>
      )}

      {/* Top plays */}
      {brief.topPlays.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Top Plays</h4>
          {brief.topPlays.slice(0, expanded ? 5 : 3).map((play, i) => (
            <PlayCard key={play.gameId} play={play} rank={i + 1} />
          ))}
          {brief.topPlays.length > 3 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-primary hover:underline"
            >
              Show {brief.topPlays.length - 3} more play{brief.topPlays.length - 3 !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Sport quick takes */}
      {brief.sportTakes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">By Sport</h4>
          {brief.sportTakes.map(take => (
            <SportTakeRow key={take.sport} take={take} />
          ))}
        </div>
      )}

      {/* Checklist */}
      {brief.checklist.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Today&apos;s Checklist</h4>
          <div className="space-y-1.5">
            {brief.checklist.map((item, i) => (
              <ChecklistItem key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground italic">{brief.disclaimer}</p>
        <button
          onClick={handleCopy}
          className="text-xs text-primary hover:underline"
        >
          {copied ? 'Copied!' : 'Copy Brief'}
        </button>
      </div>
    </div>
  )
}
