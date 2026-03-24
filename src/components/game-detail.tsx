'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'
import { getPreferredBookmaker, setPreferredBookmaker } from '@/lib/preferences'
import { getBookColor, formatBookName } from '@/lib/book-colors'
import { UnitSizingCard } from '@/components/unit-sizing-card'

const LineMovementChart = dynamic(
  () => import('@/components/line-movement-chart').then((m) => m.LineMovementChart),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading chart...</p>
      </div>
    ),
    ssr: false,
  }
)
import { InjuryImpactPanel } from '@/components/injury-impact'
import { H2HHistory } from '@/components/h2h-history'
import { AddAlertButton } from '@/components/add-alert-button'
import { GameNotes } from '@/components/game-notes'
import { formatImpliedProb, getBestMoneyline, getBestSpreadOdds, getBestTotalOdds } from '@/lib/odds'
import { useOddsFormat } from '@/components/odds-format-provider'
import { formatGameTimeFull, timeAgo, RISK_COLORS } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GameAnalysis {
  insightId?: string
  summary: string
  keyFactors: string[]
  valueAssessment: {
    side: 'home' | 'away' | 'neither'
    reasoning: string
  }
  riskLevel: 'low' | 'medium' | 'high'
  confidence: number
  disclaimer: string
  fromCache: boolean
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OddsTable({ game }: { game: NormalizedGame }) {
  const { formatPrice } = useOddsFormat()
  const [preferredBook, setPreferredBook] = useState<string | null>(null)

  useEffect(() => {
    setPreferredBook(getPreferredBookmaker())
  }, [])

  function handleSetPreferred(bookmaker: string) {
    const next = preferredBook === bookmaker ? null : bookmaker
    setPreferredBook(next)
    setPreferredBookmaker(next)
  }

  const preferredRowClass = 'bg-blue-500/10 border-l-2 border-l-blue-500'

  const bestHomeML = getBestMoneyline(game.bookmakers, 'home')
  const bestAwayML = getBestMoneyline(game.bookmakers, 'away')
  const bestHomeSpread = getBestSpreadOdds(game.bookmakers, 'home')
  const bestAwaySpread = getBestSpreadOdds(game.bookmakers, 'away')
  const bestOver = getBestTotalOdds(game.bookmakers, 'over')
  const bestUnder = getBestTotalOdds(game.bookmakers, 'under')

  const hasMoneyline = game.bookmakers.some((bk) => bk.moneyline !== null)
  const hasSpreads = game.bookmakers.some((bk) => bk.spread !== null)
  const hasTotals = game.bookmakers.some((bk) => bk.total !== null)

  return (
    <div className="space-y-6">
      {/* Moneyline */}
      {hasMoneyline && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Moneyline
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Bookmaker</th>
                  <th className="pb-2 px-4 font-medium text-right">
                    {game.awayTeam}
                  </th>
                  <th className="pb-2 pl-4 font-medium text-right">
                    {game.homeTeam}
                  </th>
                </tr>
              </thead>
              <tbody>
                {game.bookmakers.map((bk) => {
                  const bookColor = getBookColor(bk.bookmaker)
                  return bk.moneyline ? (
                    <tr
                      key={`ml-${bk.bookmaker}`}
                      className={`border-b border-border/50 ${bk.bookmaker === preferredBook ? preferredRowClass : bookColor.bg}`}
                    >
                      <td
                        className={`py-2 pr-4 cursor-pointer hover:text-foreground ${bk.bookmaker === preferredBook ? 'text-blue-400' : bookColor.text}`}
                        title={bk.bookmaker === preferredBook ? 'Click to unset preferred book' : 'Click to set as preferred book'}
                        onClick={() => handleSetPreferred(bk.bookmaker)}
                      >
                        <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: bookColor.dot }} />
                        {bk.bookmaker === preferredBook && <span className="mr-1 text-blue-400">*</span>}
                        {formatBookName(bk.bookmaker)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        <span
                          className={
                            bk.moneyline.away === bestAwayML
                              ? 'text-green-500 font-semibold'
                              : ''
                          }
                        >
                          {formatPrice(bk.moneyline.away)}
                        </span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {formatImpliedProb(bk.moneyline.away)}
                        </span>
                      </td>
                      <td className="py-2 pl-4 text-right font-mono">
                        <span
                          className={
                            bk.moneyline.home === bestHomeML
                              ? 'text-green-500 font-semibold'
                              : ''
                          }
                        >
                          {formatPrice(bk.moneyline.home)}
                        </span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {formatImpliedProb(bk.moneyline.home)}
                        </span>
                      </td>
                    </tr>
                  ) : null
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Spreads */}
      {hasSpreads && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Spread
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Bookmaker</th>
                  <th className="pb-2 px-4 font-medium text-right">
                    {game.awayTeam}
                  </th>
                  <th className="pb-2 pl-4 font-medium text-right">
                    {game.homeTeam}
                  </th>
                </tr>
              </thead>
              <tbody>
                {game.bookmakers.map((bk) => {
                  const bookColor = getBookColor(bk.bookmaker)
                  return bk.spread ? (
                    <tr
                      key={`sp-${bk.bookmaker}`}
                      className={`border-b border-border/50 ${bk.bookmaker === preferredBook ? preferredRowClass : bookColor.bg}`}
                    >
                      <td
                        className={`py-2 pr-4 cursor-pointer hover:text-foreground ${bk.bookmaker === preferredBook ? 'text-blue-400' : bookColor.text}`}
                        onClick={() => handleSetPreferred(bk.bookmaker)}
                      >
                        <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: bookColor.dot }} />
                        {bk.bookmaker === preferredBook && <span className="mr-1 text-blue-400">*</span>}
                        {formatBookName(bk.bookmaker)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        <span className="mr-2 text-muted-foreground">
                          {bk.spread.awayLine !== null &&
                            (bk.spread.awayLine > 0
                              ? `+${bk.spread.awayLine}`
                              : bk.spread.awayLine)}
                        </span>
                        <span
                          className={
                            bk.spread.awayOdds === bestAwaySpread
                              ? 'text-green-500 font-semibold'
                              : ''
                          }
                        >
                          ({formatPrice(bk.spread.awayOdds)})
                        </span>
                      </td>
                      <td className="py-2 pl-4 text-right font-mono">
                        <span className="mr-2 text-muted-foreground">
                          {bk.spread.homeLine !== null &&
                            (bk.spread.homeLine > 0
                              ? `+${bk.spread.homeLine}`
                              : bk.spread.homeLine)}
                        </span>
                        <span
                          className={
                            bk.spread.homeOdds === bestHomeSpread
                              ? 'text-green-500 font-semibold'
                              : ''
                          }
                        >
                          ({formatPrice(bk.spread.homeOdds)})
                        </span>
                      </td>
                    </tr>
                  ) : null
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals */}
      {hasTotals && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Totals (Over/Under)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Bookmaker</th>
                  <th className="pb-2 px-4 font-medium text-right">Line</th>
                  <th className="pb-2 px-4 font-medium text-right">Over</th>
                  <th className="pb-2 pl-4 font-medium text-right">Under</th>
                </tr>
              </thead>
              <tbody>
                {game.bookmakers.map((bk) => {
                  const bookColor = getBookColor(bk.bookmaker)
                  return bk.total ? (
                    <tr
                      key={`tot-${bk.bookmaker}`}
                      className={`border-b border-border/50 ${bk.bookmaker === preferredBook ? preferredRowClass : bookColor.bg}`}
                    >
                      <td
                        className={`py-2 pr-4 cursor-pointer hover:text-foreground ${bk.bookmaker === preferredBook ? 'text-blue-400' : bookColor.text}`}
                        onClick={() => handleSetPreferred(bk.bookmaker)}
                      >
                        <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: bookColor.dot }} />
                        {bk.bookmaker === preferredBook && <span className="mr-1 text-blue-400">*</span>}
                        {formatBookName(bk.bookmaker)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-muted-foreground">
                        {bk.total.line ?? '—'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        <span
                          className={
                            bk.total.overOdds === bestOver
                              ? 'text-green-500 font-semibold'
                              : ''
                          }
                        >
                          {formatPrice(bk.total.overOdds)}
                        </span>
                      </td>
                      <td className="py-2 pl-4 text-right font-mono">
                        <span
                          className={
                            bk.total.underOdds === bestUnder
                              ? 'text-green-500 font-semibold'
                              : ''
                          }
                        >
                          {formatPrice(bk.total.underOdds)}
                        </span>
                      </td>
                    </tr>
                  ) : null
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {game.bookmakers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No odds data available for this game.
        </p>
      )}

      {game.bookmakers.length > 0 && (
        <p className="text-xs text-muted-foreground/60 mt-4">
          <span className="text-green-500">Green</span> = best price across books
          {preferredBook && (
            <> &middot; <span className="text-blue-400">*Blue row</span> = your preferred book ({preferredBook.replace(/_/g, ' ')})</>
          )}
          {!preferredBook && (
            <> &middot; Click any bookmaker name to set it as preferred</>
          )}
        </p>
      )}
    </div>
  )
}

// Bookmark icon SVG
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function AnalysisPanel({ game }: { game: NormalizedGame }) {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!analysis) return
    copyAnalysisToClipboard(game, analysis)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAnalyze() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, sport: game.sport }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Analysis failed')
        return
      }

      setAnalysis(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!analysis?.insightId || saved || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/saved-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId: analysis.insightId }),
      })
      if (res.ok || res.status === 409) {
        // 409 means already saved — treat as success
        setSaved(true)
      }
    } catch {
      // silently ignore save errors — non-critical action
    } finally {
      setSaving(false)
    }
  }

  if (!analysis) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate an AI-powered breakdown of this matchup including key factors,
          value assessment, and risk analysis.
        </p>
        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analyzing...' : 'Generate Analysis'}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Badges + save button row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="font-mono">
            Confidence: {analysis.confidence}%
          </Badge>
          <Badge variant="outline">
            Risk:{' '}
            <span className={RISK_COLORS[analysis.riskLevel]}>
              {analysis.riskLevel.toUpperCase()}
            </span>
          </Badge>
          {analysis.fromCache && (
            <Badge variant="outline" className="text-xs">
              Cached
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {analysis.insightId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || saved}
              className={`h-8 gap-1.5 text-xs transition-colors ${
                saved
                  ? 'border-green-500/40 text-green-500 hover:text-green-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookmarkIcon filled={saved} />
              {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-xs transition-colors ${
              copied
                ? 'border-green-500/40 text-green-500 hover:text-green-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => shareAnalysisToX(game, analysis)}
          >
            Share to X
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div>
        <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
          Summary
        </h4>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Key Factors */}
      <div>
        <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
          Key Factors
        </h4>
        <ul className="space-y-1.5">
          {analysis.keyFactors.map((factor, i) => (
            <li key={i} className="text-sm">
              <span className="mr-2 text-muted-foreground">{i + 1}.</span>
              {factor}
            </li>
          ))}
        </ul>
      </div>

      {/* Value Assessment */}
      <div>
        <h4 className="mb-1 text-sm font-semibold text-muted-foreground">
          Value Assessment
        </h4>
        <p className="text-sm">
          <span className="font-medium capitalize">
            {analysis.valueAssessment.side === 'neither'
              ? 'No clear value'
              : `${analysis.valueAssessment.side} side`}
          </span>
          {' — '}
          {analysis.valueAssessment.reasoning}
        </p>
      </div>

      {/* Unit Sizing Recommendation */}
      {analysis.valueAssessment.side !== 'neither' && (() => {
        const bestOdds = getBestMoneyline(game.bookmakers, analysis.valueAssessment.side)
        if (!bestOdds) return null
        // Use confidence as a rough win probability proxy (scaled from 0-100 to 0-1)
        const winProb = analysis.confidence / 100
        return <UnitSizingCard winProbability={winProb} americanOdds={bestOdds} />
      })()}

      {/* Disclaimer */}
      <p className="border-t border-border pt-3 text-xs italic text-muted-foreground">
        {analysis.disclaimer}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Copy to Clipboard
// ---------------------------------------------------------------------------

function copyAnalysisToClipboard(game: NormalizedGame, analysis: GameAnalysis) {
  const side =
    analysis.valueAssessment.side === 'neither'
      ? 'No clear edge'
      : `Value: ${analysis.valueAssessment.side === 'home' ? game.homeTeam : game.awayTeam}`
  const risk = analysis.riskLevel.toUpperCase()
  const confidence = analysis.confidence

  const text = [
    `${game.awayTeam} @ ${game.homeTeam} | AI Analysis`,
    ``,
    analysis.summary,
    ``,
    `Key Factors:`,
    ...analysis.keyFactors.map((f, i) => `${i + 1}. ${f}`),
    ``,
    `${side} | Risk: ${risk} | Confidence: ${confidence}%`,
    analysis.valueAssessment.reasoning,
    ``,
    `For informational purposes only. Not financial advice.`,
  ].join('\n')

  navigator.clipboard.writeText(text).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  })
}

// ---------------------------------------------------------------------------
// Share to X
// ---------------------------------------------------------------------------

function shareAnalysisToX(game: NormalizedGame, analysis: GameAnalysis) {
  const side =
    analysis.valueAssessment.side === 'neither'
      ? 'No clear edge'
      : `Value: ${analysis.valueAssessment.side === 'home' ? game.homeTeam : game.awayTeam}`
  const risk = analysis.riskLevel.toUpperCase()
  const confidence = analysis.confidence

  const text = [
    `${game.awayTeam} @ ${game.homeTeam} | AI Analysis`,
    ``,
    analysis.summary.length > 200 ? analysis.summary.slice(0, 197) + '...' : analysis.summary,
    ``,
    `${side} | Risk: ${risk} | Confidence: ${confidence}%`,
    ``,
    `Powered by BetBrain | For informational purposes only`,
  ].join('\n')

  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420')
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GameDetail({ game }: { game: NormalizedGame }) {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Game header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {SPORT_LABELS[game.sport] ?? game.sport.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatGameTimeFull(game.commenceTime)}
          </span>
          {game.fromCache && (
            <Badge variant="outline" className="text-xs">
              {timeAgo(game.cachedAt) ? `Fetched ${timeAgo(game.cachedAt)}` : 'Cached'}
              {!game.isFresh && ' (stale)'}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 text-center sm:gap-12">
          <div className="flex-1">
            <p className="text-2xl font-bold">{game.awayTeam}</p>
            <p className="mt-1 text-xs text-muted-foreground">Away</p>
          </div>
          <span className="text-2xl font-light text-muted-foreground">@</span>
          <div className="flex-1">
            <p className="text-2xl font-bold">{game.homeTeam}</p>
            <p className="mt-1 text-xs text-muted-foreground">Home</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Link
            href={`/dashboard/picks?gameId=${encodeURIComponent(game.id)}&sport=${game.sport}&date=${game.commenceTime.slice(0, 10)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Log Pick
          </Link>
          <AddAlertButton
            gameId={game.id}
            sport={game.sport}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue={0}>
        <TabsList>
          <TabsTrigger value={0}>
            Odds ({game.bookmakers.length})
          </TabsTrigger>
          <TabsTrigger value={1}>Line Movement</TabsTrigger>
          <TabsTrigger value={2}>Injuries</TabsTrigger>
          <TabsTrigger value={3}>H2H</TabsTrigger>
          <TabsTrigger value={4}>AI Analysis</TabsTrigger>
          <TabsTrigger value={5}>Notes</TabsTrigger>
        </TabsList>

        <TabsContent value={0} className="mt-4 rounded-lg border border-border bg-card p-6">
          <OddsTable game={game} />
          <div className="mt-4 flex justify-end">
            <Link
              href="/dashboard/tools"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Odds converter &rarr;
            </Link>
          </div>
        </TabsContent>

        <TabsContent value={1} className="mt-4 rounded-lg border border-border bg-card p-6">
          <LineMovementChart
            gameId={game.id}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        </TabsContent>

        <TabsContent value={2} className="mt-4 rounded-lg border border-border bg-card p-6">
          <InjuryImpactPanel
            gameId={game.id}
            sport={game.sport}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        </TabsContent>

        <TabsContent value={3} className="mt-4 rounded-lg border border-border bg-card p-6">
          <H2HHistory
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        </TabsContent>

        <TabsContent value={4} className="mt-4 rounded-lg border border-border bg-card p-6">
          <AnalysisPanel game={game} />
        </TabsContent>

        <TabsContent value={5} className="mt-4 rounded-lg border border-border bg-card p-6">
          <GameNotes
            gameId={game.id}
            sport={game.sport}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
