'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { analyzeLineShop, calculateJuice, findLowestJuiceBook, payoutDifference } from '@/lib/line-shopping'
import { formatBookName, getBookColor } from '@/lib/book-colors'
import { useOddsFormat } from '@/components/odds-format-provider'
import type { NormalizedGame } from '@/lib/sports/config'

// ---------------------------------------------------------------------------
// Line Shopping Panel — shows best lines, discrepancies, juice comparison
// ---------------------------------------------------------------------------

export function LineShoppingPanel({ game }: { game: NormalizedGame }) {
  const { formatPrice } = useOddsFormat()
  const result = useMemo(() => analyzeLineShop(game), [game])
  const lowestJuice = useMemo(() => findLowestJuiceBook(game.bookmakers), [game.bookmakers])

  if (game.bookmakers.length < 2) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Need at least 2 bookmakers to compare lines.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Edge Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-500">
            {result.edgeSummary.avgEdge.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Avg Edge from Shopping</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <p className="text-2xl font-bold">
            {result.edgeSummary.marketsWithEdge}/{result.edgeSummary.totalMarkets}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Markets with Edge</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">
            {result.keyLineDiscrepancies.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Line Discrepancies</p>
        </div>
      </div>

      {/* Lowest Juice Book */}
      {lowestJuice && (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Lowest Juice Moneyline</h4>
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getBookColor(lowestJuice.bookmaker).dot }}
            />
            <span className="font-medium">{formatBookName(lowestJuice.bookmaker)}</span>
            <span className="font-mono text-sm">
              {formatPrice(lowestJuice.homeOdds)} / {formatPrice(lowestJuice.awayOdds)}
            </span>
            <Badge variant="outline" className="text-green-500 border-green-500/30">
              {lowestJuice.juice.toFixed(2)}% vig
            </Badge>
          </div>
        </div>
      )}

      {/* Best Lines Table */}
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50">
          <h4 className="text-sm font-semibold">Best Available Lines</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Market</th>
                <th className="px-4 py-2 text-left font-medium">Best Book</th>
                <th className="px-4 py-2 text-right font-medium">Odds</th>
                <th className="px-4 py-2 text-right font-medium">Edge vs Worst</th>
                <th className="px-4 py-2 text-right font-medium">$100 Savings</th>
              </tr>
            </thead>
            <tbody>
              {result.moneyline.home && (
                <BestLineRow
                  label={`ML ${game.homeTeam}`}
                  bookmaker={result.moneyline.home.bookmaker}
                  odds={result.moneyline.home.odds}
                  edge={result.moneyline.home.edgeVsWorst}
                  worstOdds={result.moneyline.home.allBooks[result.moneyline.home.allBooks.length - 1]?.odds}
                  formatPrice={formatPrice}
                />
              )}
              {result.moneyline.away && (
                <BestLineRow
                  label={`ML ${game.awayTeam}`}
                  bookmaker={result.moneyline.away.bookmaker}
                  odds={result.moneyline.away.odds}
                  edge={result.moneyline.away.edgeVsWorst}
                  worstOdds={result.moneyline.away.allBooks[result.moneyline.away.allBooks.length - 1]?.odds}
                  formatPrice={formatPrice}
                />
              )}
              {result.spread.home && (
                <BestLineRow
                  label={`Spread ${game.homeTeam} (${result.spread.home.line > 0 ? '+' : ''}${result.spread.home.line})`}
                  bookmaker={result.spread.home.bookmaker}
                  odds={result.spread.home.odds}
                  edge={result.spread.home.edgeVsWorst}
                  worstOdds={result.spread.home.allBooks[result.spread.home.allBooks.length - 1]?.odds}
                  formatPrice={formatPrice}
                />
              )}
              {result.spread.away && (
                <BestLineRow
                  label={`Spread ${game.awayTeam} (${result.spread.away.line > 0 ? '+' : ''}${result.spread.away.line})`}
                  bookmaker={result.spread.away.bookmaker}
                  odds={result.spread.away.odds}
                  edge={result.spread.away.edgeVsWorst}
                  worstOdds={result.spread.away.allBooks[result.spread.away.allBooks.length - 1]?.odds}
                  formatPrice={formatPrice}
                />
              )}
              {result.total.over && (
                <BestLineRow
                  label={`Over ${result.total.over.line}`}
                  bookmaker={result.total.over.bookmaker}
                  odds={result.total.over.odds}
                  edge={result.total.over.edgeVsWorst}
                  worstOdds={result.total.over.allBooks[result.total.over.allBooks.length - 1]?.odds}
                  formatPrice={formatPrice}
                />
              )}
              {result.total.under && (
                <BestLineRow
                  label={`Under ${result.total.under.line}`}
                  bookmaker={result.total.under.bookmaker}
                  odds={result.total.under.odds}
                  edge={result.total.under.edgeVsWorst}
                  worstOdds={result.total.under.allBooks[result.total.under.allBooks.length - 1]?.odds}
                  formatPrice={formatPrice}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Line Discrepancies */}
      {result.keyLineDiscrepancies.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <h4 className="text-sm font-semibold text-yellow-500 mb-3">
            Line Discrepancies Found
          </h4>
          <div className="space-y-3">
            {result.keyLineDiscrepancies.map((disc, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {disc.market === 'spread' ? 'Spread' : 'Total'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {disc.range} point range
                  </span>
                  {disc.crossesKeyNumber && (
                    <Badge className="bg-red-500/20 text-red-400 text-xs">
                      Crosses key #{disc.keyNumber}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...new Map(disc.lines.map((l) => [l.bookmaker, l])).values()].map((l) => (
                    <span key={l.bookmaker} className="text-xs text-muted-foreground">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full mr-1"
                        style={{ backgroundColor: getBookColor(l.bookmaker).dot }}
                      />
                      {formatBookName(l.bookmaker)}: {l.line > 0 ? '+' : ''}{l.line}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BestLineRow({
  label,
  bookmaker,
  odds,
  edge,
  worstOdds,
  formatPrice,
}: {
  label: string
  bookmaker: string
  odds: number
  edge: number
  worstOdds?: number
  formatPrice: (odds: number | null) => string
}) {
  const savings = worstOdds != null ? payoutDifference(odds, worstOdds) : 0
  const bookColor = getBookColor(bookmaker)

  return (
    <tr className="border-b border-border/30">
      <td className="px-4 py-2 text-left">{label}</td>
      <td className="px-4 py-2 text-left">
        <span
          className="inline-block h-2 w-2 rounded-full mr-1.5"
          style={{ backgroundColor: bookColor.dot }}
        />
        {formatBookName(bookmaker)}
      </td>
      <td className="px-4 py-2 text-right font-mono text-green-500 font-semibold">
        {formatPrice(odds)}
      </td>
      <td className="px-4 py-2 text-right">
        {edge > 0.5 ? (
          <span className="text-green-500 font-medium">+{edge.toFixed(2)}%</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-right font-mono">
        {savings > 0.5 ? (
          <span className="text-green-500">${savings.toFixed(2)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}
