'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Param {
  name: string
  type: string
  required: boolean
  description: string
}

interface Endpoint {
  method: 'GET' | 'POST'
  path: string
  description: string
  params?: Param[]
  bodyParams?: Param[]
  exampleResponse: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/odds',
    description: 'Get current odds for all sports or a specific sport. Data is cached — freshness depends on the last ingest cycle.',
    params: [
      { name: 'sport', type: 'string', required: false, description: 'Filter by sport: nba, nfl, mlb, nhl' },
      { name: 'market', type: 'string', required: false, description: 'Market type: h2h, spreads, totals' },
    ],
    exampleResponse: `{
  "games": [
    {
      "id": "abc123",
      "sport": "nba",
      "homeTeam": "Los Angeles Lakers",
      "awayTeam": "Boston Celtics",
      "commenceTime": "2026-03-14T23:00:00Z",
      "bookmakers": [...]
    }
  ],
  "apiUsageCount": 42
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/signals',
    description: 'Get current Smart Signals — games where multiple BetBrain indicators align to suggest value.',
    exampleResponse: `{
  "signals": [
    {
      "gameId": "abc123",
      "sport": "nba",
      "homeTeam": "Los Angeles Lakers",
      "awayTeam": "Boston Celtics",
      "signalTypes": ["bookmaker_variance", "ai_high_confidence"],
      "strength": "strong",
      "commenceTime": "2026-03-14T23:00:00Z"
    }
  ],
  "total": 3
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/analysis',
    description: 'Run AI analysis on a specific game. Cached for 6 hours — calling again within the window returns the cached result without burning quota.',
    bodyParams: [
      { name: 'gameId', type: 'string', required: true, description: 'Game ID from /api/v1/odds response' },
      { name: 'sport', type: 'string', required: true, description: 'Sport key: nba, nfl, mlb, nhl' },
    ],
    exampleResponse: `{
  "analysis": {
    "summary": "Lakers enter as slight favorites ...",
    "keyFactors": ["Home court advantage", "Celtics on back-to-back"],
    "valueAssessment": "Moderate value on Lakers -110",
    "riskLevel": "medium",
    "confidence": 72
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/leaderboard',
    description: 'Public leaderboard data showing top BetBrain users by performance metrics.',
    params: [
      { name: 'sort', type: 'string', required: false, description: 'Sort key: roi, profit, winRate, picks (default: roi)' },
    ],
    exampleResponse: `{
  "entries": [
    {
      "rank": 1,
      "username": "SharpBettor99",
      "roi": 18.4,
      "profit": 920,
      "winRate": 58.2,
      "picks": 71
    }
  ],
  "totalParticipants": 1284
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/picks',
    description: 'Get your logged picks with CLV (Closing Line Value) calculations. Includes per-pick CLV and aggregate CLV stats.',
    exampleResponse: `{
  "picks": [
    {
      "id": "uuid",
      "sport": "nba",
      "pick_type": "moneyline",
      "pick_team": "Lakers",
      "odds": -110,
      "closing_odds": -120,
      "clv": 2.16,
      "outcome": "win",
      "profit": 0.91,
      "units": 1
    }
  ],
  "stats": { "wins": 5, "losses": 3, "roi": 12.5 },
  "clvStats": {
    "averageCLV": 1.8,
    "weightedCLV": 2.1,
    "positiveCLVRate": 65.0,
    "totalPicks": 8
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/odds/history',
    description: 'Get historical odds snapshots for a specific game. Used for line movement analysis.',
    params: [
      { name: 'gameId', type: 'string', required: true, description: 'External game ID' },
      { name: 'market', type: 'string', required: false, description: 'Market type: h2h, spreads, totals (default: h2h)' },
    ],
    exampleResponse: `[
  {
    "bookmaker": "draftkings",
    "home_odds": -110,
    "away_odds": -110,
    "fetched_at": "2026-03-14T18:00:00Z"
  },
  {
    "bookmaker": "draftkings",
    "home_odds": -115,
    "away_odds": -105,
    "fetched_at": "2026-03-14T20:00:00Z"
  }
]`,
  },
]

const RATE_LIMIT_HEADERS = [
  { header: 'X-RateLimit-Limit', description: 'Maximum requests allowed in the current window' },
  { header: 'X-RateLimit-Remaining', description: 'Requests remaining before the limit resets' },
  { header: 'X-RateLimit-Reset', description: 'Unix timestamp when the current window resets' },
]

const CODE_EXAMPLE = `const response = await fetch('https://betbrain.ai/api/v1/odds?sport=nba', {
  headers: { 'Authorization': 'Bearer bb_live_your_api_key' }
})
const data = await response.json()
// data.games — array of NormalizedGame objects
// data.apiUsageCount — remaining daily quota`

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  if (method === 'GET') {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold font-mono bg-green-900/60 text-green-400 border border-green-800">
        GET
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold font-mono bg-blue-900/60 text-blue-400 border border-blue-800">
      POST
    </span>
  )
}

function ParamTable({ params, label }: { params: Param[]; label: string }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Type</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Required</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => (
              <tr key={p.name} className={i < params.length - 1 ? 'border-b border-border' : ''}>
                <td className="px-3 py-2 font-mono text-xs text-foreground">{p.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.type}</td>
                <td className="px-3 py-2 text-xs">
                  {p.required ? (
                    <span className="text-amber-400">required</span>
                  ) : (
                    <span className="text-muted-foreground">optional</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Method + path */}
      <div className="flex flex-wrap items-center gap-3">
        <MethodBadge method={endpoint.method} />
        <code className="font-mono text-sm text-foreground">{endpoint.path}</code>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">{endpoint.description}</p>

      {/* Query params */}
      {endpoint.params && endpoint.params.length > 0 && (
        <ParamTable params={endpoint.params} label="Query Parameters" />
      )}

      {/* Body params */}
      {endpoint.bodyParams && endpoint.bodyParams.length > 0 && (
        <ParamTable params={endpoint.bodyParams} label="Request Body" />
      )}

      {/* Example response */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example Response</p>
        <pre className="overflow-x-auto rounded-md bg-zinc-900 border border-border p-4 font-mono text-xs text-green-300 leading-relaxed">
          {endpoint.exampleResponse}
        </pre>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApiDocs() {
  const maskedKey = 'bb_live_••••••••••••••••'

  function handleGenerateKey() {
    alert('API key generation coming soon. Contact support for early access.')
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(maskedKey).catch(() => {})
  }

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Access</h1>
        <p className="mt-2 text-muted-foreground">
          Programmatic access to BetBrain&apos;s analysis engine. Available on the API tier ($49/mo).
        </p>
      </div>

      {/* ── API Key ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your API Key</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
          <code className="flex-1 font-mono text-sm text-muted-foreground select-none tracking-wider">
            {maskedKey}
          </code>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyKey}
              className="font-mono text-xs"
            >
              Copy
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateKey}
              className="text-xs"
            >
              Generate API Key
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Keep your API key secret. Include it in the{' '}
          <code className="font-mono text-xs text-foreground">Authorization: Bearer</code> header on every request.
        </p>
      </section>

      {/* ── Endpoints ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Endpoints</h2>
        <div className="space-y-4">
          {ENDPOINTS.map((ep) => (
            <EndpointCard key={ep.path} endpoint={ep} />
          ))}
        </div>
      </section>

      {/* ── Rate Limits ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rate Limits</h2>
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            API tier accounts are limited to{' '}
            <span className="font-semibold text-foreground">1,000 requests/day</span>. Exceeding the limit returns{' '}
            <code className="font-mono text-xs text-foreground">429 Too Many Requests</code>.
          </p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate Limit Headers</p>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Header</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_LIMIT_HEADERS.map((h, i) => (
                    <tr key={h.header} className={i < RATE_LIMIT_HEADERS.length - 1 ? 'border-b border-border' : ''}>
                      <td className="px-3 py-2 font-mono text-xs text-foreground">{h.header}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{h.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Code Example ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Code Example</h2>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="mb-3 text-sm text-muted-foreground">
            Fetch NBA odds using the browser Fetch API or any HTTP client:
          </p>
          <pre className="overflow-x-auto rounded-md bg-zinc-900 border border-border p-4 font-mono text-xs text-blue-300 leading-relaxed">
            {CODE_EXAMPLE}
          </pre>
        </div>
      </section>

      {/* ── Pricing callout ── */}
      <section>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">$49</span>
                <span className="text-muted-foreground">/mo</span>
                <Badge variant="outline" className="ml-1 text-xs">API Access</Badge>
              </div>
              <ul className="space-y-1">
                {[
                  '1,000 requests/day',
                  'All 6 endpoints (odds, signals, analysis, leaderboard, picks, history)',
                  'CLV tracking and bankroll analytics',
                  'Webhook support (coming soon)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-green-400 font-bold">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:self-center"
            >
              Upgrade
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
