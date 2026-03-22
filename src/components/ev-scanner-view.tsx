import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { TermTooltip } from '@/components/term-tooltip'
import { OddsDisplay } from '@/components/odds-display'
import { formatGameTime } from '@/lib/format'
import { SPORT_LABELS } from '@/lib/sports/config'
import type { EVOpportunity, ArbitrageOpportunity } from '@/lib/ev-scanner'

function EVCard({ opp }: { opp: EVOpportunity }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {SPORT_LABELS[opp.game.sport] ?? opp.game.sport.toUpperCase()}
          </Badge>
          <Badge className="bg-green-500/20 text-green-500 text-xs">
            +{opp.ev}% EV
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatGameTime(opp.game.commenceTime)}
        </span>
      </div>

      <p className="mb-1 text-sm font-medium">
        {opp.game.awayTeam} @ {opp.game.homeTeam}
      </p>

      <div className="mb-3 rounded-md bg-green-500/5 border border-green-500/20 px-3 py-2">
        <p className="text-xs text-green-500 font-medium">
          {opp.team} ({opp.side}) on {opp.bookmaker.replace(/_/g, ' ')}
        </p>
        <div className="mt-1 flex items-center gap-4 text-sm">
          <span>
            Book: <strong className="text-green-500"><OddsDisplay odds={opp.bookOdds} /></strong>
          </span>
          <span className="text-muted-foreground">
            Fair: <OddsDisplay odds={opp.fairOdds} />
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Fair prob: {(opp.fairProbability * 100).toFixed(1)}%</span>
        <span>Book implied: {(opp.bookImplied * 100).toFixed(1)}%</span>
      </div>

      <div className="mt-3">
        <Link
          href={`/dashboard/games/${opp.game.id}`}
          className="inline-flex h-8 w-full items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          View Game
        </Link>
      </div>
    </div>
  )
}

function ArbCard({ arb }: { arb: ArbitrageOpportunity }) {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase">
            {SPORT_LABELS[arb.game.sport] ?? arb.game.sport.toUpperCase()}
          </Badge>
          <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">
            {arb.profit}% Arb
          </Badge>
        </div>
      </div>

      <p className="mb-2 text-sm font-medium">
        {arb.game.awayTeam} @ {arb.game.homeTeam}
      </p>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {arb.game.homeTeam} on {arb.homeBest.bookmaker.replace(/_/g, ' ')}
          </span>
          <OddsDisplay odds={arb.homeBest.odds} className="font-mono font-medium" />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {arb.game.awayTeam} on {arb.awayBest.bookmaker.replace(/_/g, ' ')}
          </span>
          <OddsDisplay odds={arb.awayBest.odds} className="font-mono font-medium" />
        </div>
      </div>
    </div>
  )
}

export function EVScannerView({
  opportunities,
  arbitrage,
  gamesScanned,
}: {
  opportunities: EVOpportunity[]
  arbitrage: ArbitrageOpportunity[]
  gamesScanned: number
}) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="default">
          {opportunities.length} +EV Bet{opportunities.length !== 1 ? 's' : ''}
        </Badge>
        {arbitrage.length > 0 && (
          <Badge className="bg-yellow-500/20 text-yellow-500">
            {arbitrage.length} Arbitrage
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {gamesScanned} games scanned
        </span>
      </div>

      {/* Arbitrage (rare and high-value, show first) */}
      {arbitrage.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold"><TermTooltip term="Arbitrage">Arbitrage</TermTooltip> Opportunities</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {arbitrage.map((arb) => (
              <ArbCard key={arb.game.id} arb={arb} />
            ))}
          </div>
        </div>
      )}

      {/* +EV Opportunities */}
      {opportunities.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Positive <TermTooltip term="+EV">EV</TermTooltip> Bets</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opp, i) => (
              <EVCard key={`${opp.game.id}-${opp.side}-${opp.bookmaker}-${i}`} opp={opp} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">No +EV opportunities right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            +EV bets appear when a bookmaker&apos;s odds are better than the fair market
            price. Check back closer to game time when odds are moving.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        For informational purposes only. Fair odds are estimated from multi-book
        consensus. +EV does not guarantee a win on any individual bet.
      </p>
    </div>
  )
}
