import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Betting 101 — How Sports Betting Works | BetBrain',
  description:
    'New to sports betting? Learn how odds work, what moneyline and spread mean, and how to make smarter bets with data.',
  openGraph: {
    title: 'Betting 101 — How Sports Betting Works',
    description:
      'Learn American odds, moneylines, spreads, and implied probability in 5 minutes.',
  },
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Example({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-2 text-xs font-semibold uppercase text-indigo-400">
        {label}
      </p>
      {children}
    </div>
  )
}

export default function Betting101Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-12">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to BetBrain
        </Link>
        <h1 className="mt-4 text-4xl font-bold">Betting 101</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          New to sports betting? This guide covers everything you need to know
          in 5 minutes.
        </p>
      </div>

      <div className="space-y-12">
        {/* What is a bet? */}
        <Section title="What is a sports bet?">
          <p className="text-muted-foreground">
            A sports bet is a prediction on the outcome of a game. You place
            money on your prediction, and if you&apos;re right, you win money
            back. If you&apos;re wrong, you lose what you wagered.
          </p>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Bookmakers</strong> (also called
            sportsbooks) are companies like DraftKings, FanDuel, and BetMGM that
            set the odds and accept your bets. Different bookmakers often offer
            different prices on the same game — that&apos;s why comparing odds
            matters.
          </p>
        </Section>

        {/* American Odds */}
        <Section title="How American odds work">
          <p className="text-muted-foreground">
            In the US, odds are displayed in <strong className="text-foreground">American format</strong> — numbers
            with a plus (+) or minus (-) sign. Here&apos;s what they mean:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Example label="Negative odds (favorite)">
              <p className="text-lg font-bold">-150</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You need to bet <strong>$150</strong> to win <strong>$100</strong>.
                The team is favored — more likely to win, so the payout is smaller.
              </p>
            </Example>
            <Example label="Positive odds (underdog)">
              <p className="text-lg font-bold">+200</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A <strong>$100</strong> bet wins <strong>$200</strong>.
                The team is the underdog — less likely to win, so the payout is bigger.
              </p>
            </Example>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Rule of thumb:</strong> The
            bigger the negative number, the more heavily favored. The bigger the
            positive number, the bigger the potential payout (but lower chance of
            winning).
          </p>
        </Section>

        {/* Bet Types */}
        <Section title="Three main bet types">
          <div className="space-y-4">
            <Example label="Moneyline">
              <p className="text-sm text-muted-foreground">
                The simplest bet — pick which team wins. No point spreads, no
                catches. Lakers <strong>-180</strong> vs Celtics{' '}
                <strong>+160</strong> means the Lakers are favored and the
                Celtics are the underdogs.
              </p>
            </Example>

            <Example label="Spread (Point Spread)">
              <p className="text-sm text-muted-foreground">
                The bookmaker sets a handicap. If the Lakers are{' '}
                <strong>-5.5</strong>, they need to win by 6 or more points for
                your bet to win. If you bet on the Celtics{' '}
                <strong>+5.5</strong>, they can lose by up to 5 points and you
                still win. This evens out mismatched games.
              </p>
            </Example>

            <Example label="Total (Over/Under)">
              <p className="text-sm text-muted-foreground">
                Bet on whether the combined score of both teams will be{' '}
                <strong>over</strong> or <strong>under</strong> a number set by
                the bookmaker. If the total is set at 215.5, you bet on whether
                the final combined score is 216+ (over) or 215 or less (under).
              </p>
            </Example>
          </div>
        </Section>

        {/* Implied Probability */}
        <Section title="What is implied probability?">
          <p className="text-muted-foreground">
            Every set of odds implies a probability — how likely the bookmaker
            thinks the outcome is. BetBrain shows this as a percentage next to
            the odds.
          </p>

          <Example label="Converting odds to probability">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">-110</strong> odds = <strong className="text-foreground">52.4%</strong>{' '}
                implied probability
              </p>
              <p>
                <strong className="text-foreground">+200</strong> odds = <strong className="text-foreground">33.3%</strong>{' '}
                implied probability
              </p>
              <p>
                <strong className="text-foreground">-300</strong> odds = <strong className="text-foreground">75.0%</strong>{' '}
                implied probability
              </p>
            </div>
          </Example>

          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Why it matters:</strong> If you
            think a team has a 60% chance of winning but the odds imply only 50%,
            that&apos;s a{' '}
            <strong className="text-foreground">value bet</strong> — the price is
            better than it should be.
          </p>
        </Section>

        {/* Bankroll */}
        <Section title="Bankroll basics">
          <p className="text-muted-foreground">
            Smart bettors don&apos;t bet in dollar amounts — they use{' '}
            <strong className="text-foreground">units</strong>. One unit is a
            fixed percentage of your bankroll (typically 1-3%).
          </p>

          <Example label="Example">
            <p className="text-sm text-muted-foreground">
              If your bankroll is $500 and your unit size is 2%, one unit = $10.
              Whether you&apos;re betting on a -200 favorite or a +300 underdog,
              you risk 1 unit ($10). This protects your bankroll from big
              swings.
            </p>
          </Example>

          <p className="text-sm text-muted-foreground">
            BetBrain&apos;s pick tracker uses units so you can compare
            performance across different odds and bet sizes.
          </p>
        </Section>

        {/* What BetBrain Does */}
        <Section title="How BetBrain helps">
          <div className="space-y-2 text-muted-foreground">
            <p>
              <strong className="text-foreground">Compare odds</strong> — See
              prices from 20+ sportsbooks side by side. The best price is
              highlighted in green.
            </p>
            <p>
              <strong className="text-foreground">AI analysis</strong> — Get a
              data-driven breakdown of any matchup: key factors, who has the
              edge, and risk level.
            </p>
            <p>
              <strong className="text-foreground">Smart Signals</strong> — Games
              where multiple indicators align to suggest potential value.
            </p>
            <p>
              <strong className="text-foreground">Track your picks</strong> — Log
              your bets and see your win rate, ROI, and whether you&apos;re
              beating the closing line over time.
            </p>
          </div>
        </Section>

        {/* CTA */}
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-6 text-center">
          <h2 className="text-xl font-bold">Ready to start?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a free account and start comparing odds across every game.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center rounded-md bg-indigo-500 px-6 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
            >
              Sign up free
            </Link>
            <Link
              href="/dashboard/glossary"
              className="inline-flex h-10 items-center rounded-md border border-border px-6 text-sm font-medium transition-colors hover:bg-accent"
            >
              View glossary
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          For informational purposes only. BetBrain provides analytics — never
          bet more than you can afford to lose.
        </p>
      </div>
    </div>
  )
}
