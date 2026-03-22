import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Changelog — BetBrain',
  description: 'Recent updates and new features added to BetBrain.',
  openGraph: {
    title: 'Changelog — BetBrain',
    description: 'See what\'s new in BetBrain.',
  },
}

const updates = [
  {
    date: '2026-03-22',
    title: 'Odds Format Toggle & Legal Pages',
    items: [
      'Switch between American (-110) and Decimal (1.91) odds from the nav bar',
      'Toggle applies across all dashboard pages — game cards, EV scanner, picks, parlays, charts',
      'Privacy Policy and Terms of Service pages added',
      'Keyboard shortcuts help dialog (press ? to see all shortcuts)',
    ],
  },
  {
    date: '2026-03-20',
    title: '+EV Scanner & Arbitrage Detection',
    items: [
      'Find positive expected value bets across all bookmakers',
      'Arbitrage opportunities flagged automatically when odds diverge',
      'Fair odds calculated from multi-book consensus',
    ],
  },
  {
    date: '2026-03-20',
    title: 'Auto-Resolve NBA Picks',
    items: [
      'NBA picks automatically marked as win/loss/push from final scores',
      'Works for moneyline, spread, and over/under',
      'Daily cron job resolves picks and Smart Signals overnight',
    ],
  },
  {
    date: '2026-03-19',
    title: 'Betting 101 Guide',
    items: [
      'Beginner-friendly guide covering odds, spreads, totals, and implied probability',
      'Onboarding checklist rewritten with clearer explanations',
      'Tooltips on all betting terms throughout the dashboard',
    ],
  },
  {
    date: '2026-03-17',
    title: 'Social Sharing & Analytics',
    items: [
      'Share your pick record with custom OG images',
      'Analytics dashboard showing performance trends and CLV stats',
      'Signal historical hit rate tracking',
    ],
  },
  {
    date: '2026-03-15',
    title: 'CLV Tracking & Bankroll Tools',
    items: [
      'Closing Line Value tracked on every pick',
      'Bankroll management with Kelly Criterion guidance',
      'Pick filtering and sorting by outcome, sport, date, and CLV',
    ],
  },
  {
    date: '2026-03-14',
    title: 'Premium Features Launch',
    items: [
      'Player prop analyzer with AI projections',
      'Parlay builder with EV calculation and correlation warnings',
      'Historical backtesting with simulated results',
      'Public leaderboard with ROI rankings',
    ],
  },
  {
    date: '2026-03-13',
    title: 'Core Platform',
    items: [
      'Odds comparison across 20+ bookmakers',
      'AI game analysis powered by Claude',
      'Smart Signals multi-factor detection',
      'Line movement charts',
      'Pick tracker with ROI',
      'Custom alerts on moneyline, spread, and totals',
    ],
  },
]

export default function ChangelogPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'BetBrain Changelog',
    itemListElement: updates.map((u, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: u.title,
      description: u.items.join('. '),
    })),
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to BetBrain
        </Link>
        <h1 className="mt-4 text-4xl font-bold">Changelog</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          What&apos;s new in BetBrain
        </p>
      </div>

      <div className="space-y-10">
        {updates.map((update) => (
          <div key={update.date + update.title} className="relative pl-6 border-l-2 border-border">
            <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-indigo-500" />
            <time className="text-xs font-medium text-muted-foreground">{update.date}</time>
            <h2 className="mt-1 text-lg font-semibold">{update.title}</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {update.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        For informational purposes only. BetBrain is an analytics tool, not a sportsbook.
      </p>
    </div>
  )
}
