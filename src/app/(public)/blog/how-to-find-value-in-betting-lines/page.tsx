import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Find Value in Betting Lines — BetBrain',
  description:
    'A comprehensive guide to identifying value in sports betting lines using odds comparison, line movement analysis, and statistical indicators.',
}

export default function HowToFindValuePage() {
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Find Value in Betting Lines',
    description:
      'A comprehensive guide to identifying value in sports betting lines using odds comparison, line movement analysis, and statistical indicators.',
    author: { '@type': 'Organization', name: 'BetBrain' },
    publisher: { '@type': 'Organization', name: 'BetBrain' },
    datePublished: '2026-02-01',
    dateModified: '2026-03-14',
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-base font-semibold tracking-tight text-white hover:text-zinc-200 transition-colors">
            BetBrain
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-md transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-24 sm:pt-20">

        {/* Back link */}
        <div className="mb-10">
          <Link
            href="/blog"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            &larr; Back to Blog
          </Link>
        </div>

        {/* Header */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium tracking-wide mb-5">
            STRATEGY GUIDE
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15] mb-5">
            How to Find Value in Betting Lines: A Data-Driven Guide
          </h1>
          <p className="text-sm text-zinc-500">March 14, 2026 &middot; BetBrain</p>
        </header>

        {/* Body */}
        <div className="space-y-10 text-zinc-300 leading-relaxed">

          {/* Intro */}
          <section>
            <p className="text-lg text-zinc-300 leading-relaxed">
              Ask a hundred sports bettors what separates consistent winners from the rest
              and most will give you some version of the same answer: finding value. The
              concept sounds simple but most bettors never apply it rigorously. They bet
              teams they like, follow public sentiment, or chase steam — and over time the
              vig grinds them down. Understanding what value actually means, and building a
              systematic process for finding it, is the foundation of any approach to betting
              that takes long-term results seriously.
            </p>
            <p className="mt-4 text-zinc-400">
              Value in betting is not about picking winners. It is about identifying when the
              price offered by a bookmaker does not accurately reflect the true probability of
              an outcome. If a team has a 55% chance of winning a game but the moneyline
              implies only a 48% probability, that is a positive-value bet regardless of
              whether that team wins or loses on any given night. Executed consistently over
              a large enough sample, positive-value betting is the only mathematically
              sustainable approach to sports wagering.
            </p>
          </section>

          {/* Implied Probability */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Understanding Implied Probability
            </h2>
            <p className="text-zinc-400">
              Every betting line encodes a probability. American odds make this less obvious
              than decimal odds, but the conversion is straightforward. For negative American
              odds — the favorite — divide the absolute value of the odds by the sum of the
              absolute value and 100. A line of -110 implies a probability of 110 / (110 +
              100) = 52.4%. For positive odds — the underdog — divide 100 by the sum of 100
              and the odds. A line of +130 implies a probability of 100 / (100 + 130) = 43.5%.
            </p>
            <p className="mt-4 text-zinc-400">
              Notice that if you add up the implied probabilities on both sides of a typical
              game, you get more than 100%. A -110 / -110 line implies 52.4% + 52.4% = 104.8%.
              That 4.8% excess is the vig — the bookmaker&apos;s built-in margin. To break
              even at -110 on both sides you need to win 52.38% of your bets. This is not
              discussed nearly enough by casual bettors. The vig is a constant tax on every
              wager. Finding value means finding bets where your estimated true probability
              exceeds the implied probability by more than the vig.
            </p>

            <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
                Quick Reference: American Odds to Implied Probability
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['+100', '50.0%'],
                  ['+110', '47.6%'],
                  ['+130', '43.5%'],
                  ['+150', '40.0%'],
                  ['+200', '33.3%'],
                  ['-110', '52.4%'],
                  ['-120', '54.5%'],
                  ['-150', '60.0%'],
                  ['-200', '66.7%'],
                  ['-300', '75.0%'],
                ].map(([odds, prob]) => (
                  <div key={odds} className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                    <span className={`font-mono font-medium tabular-nums ${odds.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {odds}
                    </span>
                    <span className="text-zinc-400 tabular-nums">{prob}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-5 text-zinc-400">
              Your edge comes from estimating true probability more accurately than the
              market does. That estimate has to come from somewhere — historical win rates
              in similar situations, statistical models, news that has not yet been priced in.
              The implied probability table is the benchmark you are always comparing against.
            </p>
          </section>

          {/* Line Shopping */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Line Shopping Basics</h2>
            <p className="text-zinc-400">
              Even if you cannot build a sophisticated probability model, there is one
              source of value available to every bettor right now: line shopping. Different
              books post different odds on the same game. Getting the best available price
              on every bet you make is the simplest, most reliable way to improve your
              results over time.
            </p>
            <p className="mt-4 text-zinc-400">
              The difference between +150 and +140 on an underdog bet sounds minor, but
              it compounds significantly. At +150, a $100 bet returns $150 profit. At +140,
              that same bet returns $140. Over 100 bets at that price — assuming a hit rate
              that makes both bets break-even propositions — the difference in return is
              $1,000. The bettor who always got +150 instead of +140 made an extra thousand
              dollars on the same wagers just by checking one more book.
            </p>
            <p className="mt-4 text-zinc-400">
              On spread bets, the difference between -110 and -115 is equally meaningful.
              At -110 you need to win 52.38% to break even. At -115 that number rises to
              53.49%. That extra 1.1% is a substantial drag over a large sample, and it
              represents no additional analytical skill — just the cost of not shopping.
              When you have access to multiple books and an odds aggregation tool, there is
              no reason to accept an inferior line.
            </p>
          </section>

          {/* Line Movement */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Reading Line Movement</h2>
            <p className="text-zinc-400">
              Betting lines move between their opening and the start of a game for two
              primary reasons: significant public betting volume pushing the line, or sharp
              (professional) money forcing a correction. Understanding which of these is
              driving a move is one of the most valuable skills in sports betting.
            </p>
            <p className="mt-4 text-zinc-400">
              Public betting tends to move lines in predictable directions. The public
              disproportionately bets favorites and well-known teams. A popular team opening
              at -3.5 might move to -5 purely on volume even if the sharp community has
              no strong opinion. That line inflation on public favorites is one of the most
              durable inefficiencies in the market — fading the public on certain game types
              has historically shown positive expected value over large samples.
            </p>
            <p className="mt-4 text-zinc-400">
              Sharp money is different. When professional betting syndicates identify a
              mispriced line, they bet it aggressively. Books respond by moving the line
              quickly to reduce their exposure. The signature of sharp action is a line that
              moves against the direction of public betting — what is known as reverse line
              movement. If 70% of the public bets a favorite and the line moves in favor of
              the underdog, that is a signal that sharp money is on the underdog.
            </p>
            <p className="mt-4 text-zinc-400">
              Steam moves are coordinated sharp action hitting multiple books simultaneously.
              When a line moves several points in a short window across many bookmakers at
              once, a steam move is the most likely cause. Acting quickly on steam — before
              the books catch up — is one of the few genuine real-time edges retail bettors
              can access, though the window is often just minutes.
            </p>
            <p className="mt-4 text-zinc-400">
              Timing your bet relative to line movement matters. Betting early — close to
              the opener — captures value before the market has processed most of the
              available information. But it also means betting before injury news, weather
              updates, and sharp action have been incorporated. Betting late captures that
              information but means accepting wherever the line has settled. The right answer
              depends on why you have conviction on a bet — if it is based on a statistical
              edge unlikely to be moved by public action, early is often better.
            </p>
          </section>

          {/* Statistical Indicators */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Statistical Indicators That Matter
            </h2>
            <p className="text-zinc-400 mb-5">
              Not all statistics are equally predictive. Bettors who confuse descriptive
              statistics (what happened) with predictive signals (what is likely to happen)
              make poor models. These are the categories most consistently useful for
              identifying line value.
            </p>

            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-white mb-2">Recent Form and Trends</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Recent form matters but requires careful interpretation. A team that has
                  won six straight games looks impressive until you check whether those wins
                  came against bottom-tier opponents by narrow margins. Quality-adjusted
                  recent form — how a team has performed relative to the opposition it has
                  faced — is more predictive than raw win-loss records. Net efficiency
                  metrics (points per possession on offense and defense) stabilize faster
                  than win-loss record and better capture underlying team quality.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-2">Home/Away Splits</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Home field and home court advantage are real and well-documented, but their
                  magnitude varies significantly by team, sport, and venue. Some teams perform
                  dramatically better at home; others are remarkably consistent across
                  locations. Market lines already account for average home advantage, so the
                  analytical value is in identifying teams whose specific home/away split
                  deviates significantly from the typical — either teams that are exceptional
                  at home and underpriced, or teams whose road record is far worse than their
                  overall record suggests.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-2">Rest and Scheduling</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Rest-day advantages have measurable effects on performance in high-game-volume
                  sports like NBA and NHL. Back-to-back games, short rest after travel, and
                  schedule spots at the end of long road trips all show up in the data as
                  performance degraders. Books adjust their lines for obvious rest situations,
                  but they often underweight compound scheduling factors — a team on the second
                  night of a back-to-back playing their fourth game in six nights on the road
                  may be more impaired than the line implies.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Historical Head-to-Head Matchups
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Head-to-head history is frequently overweighted by the public and correctly
                  given less weight by sharp bettors — rosters change, coaches change, and a
                  series result from three years ago tells you almost nothing about
                  today&apos;s game. The exception is very recent head-to-head results within
                  the same season, where stylistic matchup data has current relevance. A
                  team that won its last four meetings against a specific opponent due to a
                  specific defensive scheme that the matchup exploits remains useful context
                  — but only if the personnel and systems that drove those results are still
                  in place.
                </p>
              </div>
            </div>
          </section>

          {/* Using AI Tools */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Using AI Tools to Find Value
            </h2>
            <p className="text-zinc-400">
              The analytical work described above — converting implied probabilities,
              comparing lines across books, tracking line movement, cross-referencing
              statistical splits — is laborious to do manually at scale. A bettor seriously
              working ten games per night across multiple sports would need hours just to
              gather and organize the data. AI analytics platforms automate that work and
              surface the outputs in a form that is immediately actionable.
            </p>
            <p className="mt-4 text-zinc-400">
              BetBrain&apos;s Smart Signals feature does exactly this. Rather than requiring
              a user to check every game individually, the system monitors all available
              games simultaneously and surfaces the ones where multiple indicators align:
              significant bookmaker variance suggesting market disagreement, line movement
              patterns consistent with sharp action, statistical edges in the matchup data,
              and AI analysis rating the game as having notable value. When several of these
              signals point in the same direction, the game gets flagged.
            </p>
            <p className="mt-4 text-zinc-400">
              Odds variance detection is particularly useful for finding line shopping
              opportunities in real time. When the spread between the best and worst
              available line on a game exceeds historical norms, that is often a sign of
              rapid market adjustment — and a narrow window to capture the better price
              before it closes. Automated monitoring makes it possible to catch these
              windows across a full slate of games rather than checking manually.
            </p>
          </section>

          {/* Common Mistakes */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Common Mistakes to Avoid</h2>

            <div className="space-y-4">
              {[
                {
                  mistake: 'Chasing steam without context',
                  detail:
                    'Steam moves indicate sharp action, but not all sharp action is correct. Betting into steam without understanding what information is driving the move can put you on the right side of a line adjustment you have already missed.',
                },
                {
                  mistake: 'Ignoring the vig',
                  detail:
                    'Bettors who evaluate their picks based on win percentage without accounting for the vig consistently overestimate their edge. At standard -110 juice, a 53% win rate is only slightly profitable. Track your results using actual dollar profit and loss, not raw win rate.',
                },
                {
                  mistake: 'Confirmation bias in data selection',
                  detail:
                    'It is easy to find statistics that support whatever conclusion you have already reached. Genuine analytical work means actively looking for evidence against your position. If you cannot find arguments for the other side, you have not done the analysis.',
                },
                {
                  mistake: 'Overreacting to small samples',
                  detail:
                    'A team that has covered the spread in six consecutive games has likely done so at least partly due to variance. Over a full season, most teams regress toward their expected cover rate. Building a system on recent small-sample streaks tends to catch trends right as they are ending.',
                },
                {
                  mistake: 'Not tracking results',
                  detail:
                    "Bettors who don't keep honest records of every bet — including the line they got, the amount, and the outcome — are flying blind. Memory is selective and optimistic. The only way to know if your process is working is a complete, accurate record over a meaningful sample size.",
                },
              ].map((item) => (
                <div key={item.mistake} className="flex gap-4">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/70 shrink-0" />
                  <div>
                    <span className="text-white font-medium text-sm">{item.mistake}: </span>
                    <span className="text-zinc-400 text-sm leading-relaxed">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sustainable Approach */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Building a Sustainable Approach
            </h2>
            <p className="text-zinc-400">
              Discipline and bankroll management separate bettors who grind out positive
              results over time from those who have a few good months and then blow up.
              The math of sports betting makes variance unavoidable — even a legitimate
              edge will produce long losing stretches. Bankroll management is what keeps
              those stretches from ending your betting entirely.
            </p>
            <p className="mt-4 text-zinc-400">
              A standard approach is to define a unit as 1% to 2% of your total betting
              bankroll and size every bet in units rather than fixed dollar amounts. This
              automatically scales your bets down during losing stretches (when your
              bankroll shrinks) and up during winning periods. Never bet more than 3-5
              units on a single game regardless of conviction. The games you are most
              confident about are not reliably better bets — high confidence often reflects
              confirmation bias more than genuine edge.
            </p>
            <p className="mt-4 text-zinc-400">
              Track your ROI (return on investment) as your primary performance metric.
              ROI is profit divided by total amount wagered. A 3-5% ROI over 500 or more
              bets is exceptional performance. If your ROI over a large sample is negative
              or breakeven, your process needs adjustment regardless of how many individual
              winning bets you remember. The sample matters — drawing conclusions from fewer
              than 200 bets is not meaningful given the variance inherent in sports outcomes.
            </p>
            <p className="mt-4 text-zinc-400">
              Finally, selective betting almost always outperforms high volume. Betting
              every game on the slate dilutes your edge across too many low-confidence
              situations. Identifying the two or three games per day where your analysis
              gives you genuine conviction — where the line looks meaningfully off and you
              understand why — is more productive than firing on a dozen games to stay
              active. Quality over volume is the consistent pattern among long-term winning
              sports bettors.
            </p>
          </section>

          {/* Responsible Gambling */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 text-xs font-medium tracking-wide mb-4">
              RESPONSIBLE GAMBLING
            </div>
            <h2 className="text-lg font-semibold text-white mb-3">
              A Note on Responsible Gambling
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
              The strategies in this guide are informational — they describe analytical
              approaches, not guaranteed profits. Sports betting involves real risk of
              financial loss. No system, tool, or strategy changes the fundamental nature
              of that risk. Value betting improves your expected outcome over large samples
              but does not eliminate losing stretches or guarantee any individual result.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
              Only bet with money you can afford to lose. Set a budget before you start,
              track every bet honestly, and review your results regularly. If you find
              yourself increasing your bet sizes to recover losses, betting more than you
              planned, or feeling like you must bet to feel okay, these are warning signs
              that warrant taking a break and seeking support.
            </p>
            <p className="text-sm text-zinc-500 leading-relaxed border-l-2 border-zinc-700 pl-4">
              If you or someone you know has a gambling problem, call{' '}
              <span className="text-zinc-300 font-medium">1-800-GAMBLER</span>.
            </p>
          </section>

        </div>

        {/* CTA */}
        <div className="mt-16 pt-10 border-t border-zinc-800 text-center">
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            BetBrain automates the data work — odds comparison across bookmakers, line
            movement tracking, Smart Signal detection — so you can focus on the decisions.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            Try BetBrain free
          </Link>
          <div className="mt-6">
            <Link href="/blog" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              &larr; Back to Blog
            </Link>
          </div>
        </div>

      </article>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="max-w-lg">
              <div className="text-sm font-semibold text-white mb-2">BetBrain</div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                BetBrain provides analytics and insights only. We do not facilitate gambling or
                accept wagers of any kind. All content is for informational purposes only and
                does not constitute financial or gambling advice. If you or someone you know has
                a gambling problem, call{' '}
                <span className="text-zinc-500">1-800-GAMBLER</span>.
              </p>
            </div>
            <nav className="flex flex-row sm:flex-col gap-3 sm:gap-2 text-sm shrink-0">
              <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                Home
              </Link>
              <Link href="/blog" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                Blog
              </Link>
              <Link href="/login" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                Sign Up
              </Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-900 text-xs text-zinc-700">
            &copy; {new Date().getFullYear()} BetBrain. Analytics and insights only.
          </div>
        </div>
      </footer>

    </div>
  )
}
