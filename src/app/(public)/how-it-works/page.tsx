import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How It Works — BetBrain',
  description: 'Learn how BetBrain uses AI to analyze sports betting odds and identify value plays.',
}

const steps = [
  {
    number: '1',
    title: 'We Aggregate the Data',
    body: 'BetBrain pulls real-time odds from major sportsbooks and combines them with team stats, player data, and historical performance.',
  },
  {
    number: '2',
    title: 'AI Analyzes Every Angle',
    body: 'Our AI engine (powered by Claude) evaluates matchups, identifies statistical edges, detects line movement patterns, and flags games where bookmaker odds diverge significantly.',
  },
  {
    number: '3',
    title: 'You Get Actionable Insights',
    body: 'Smart Signals highlight the games with the strongest alignment of indicators. No picks — just data-driven analysis so you can make informed decisions.',
  },
]

const features = [
  {
    title: 'Odds Comparison',
    description: 'Side-by-side odds from multiple bookmakers. Best lines highlighted in green.',
  },
  {
    title: 'Smart Signals',
    description: 'When odds, stats, and AI analysis all align, we flag it. These are the games worth a closer look.',
  },
  {
    title: 'Line Movement Tracking',
    description: 'See how odds shift over time. Sudden moves can reveal where sharp money is flowing.',
  },
  {
    title: 'AI Game Analysis',
    description: 'Deep matchup breakdowns powered by Claude. Key factors, value assessment, and risk level for every game.',
  },
  {
    title: 'Injury Impact',
    description: 'AI evaluates how key injuries affect win probability compared to the current betting line.',
  },
  {
    title: 'Pick Tracker',
    description: 'Log your picks and track your record over time. Win rate, profit/loss, and ROI at a glance.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">

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

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium tracking-wide mb-6">
            AI-POWERED SPORTS ANALYTICS
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            How BetBrain Works
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed max-w-2xl">
            AI-powered analytics that help you find value in sports betting markets
          </p>
        </div>
      </section>

      {/* Step-by-step process */}
      <section className="border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              From data to decision
            </h2>
            <p className="text-zinc-400 max-w-xl">
              Three steps from live market data to structured, actionable insight.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-10">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col gap-4">
                {/* Step number badge */}
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-base tabular-nums">
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Everything in one dashboard
            </h2>
            <p className="text-zinc-400 max-w-xl">
              The full toolkit for data-driven sports analysis — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
              >
                <h3 className="text-base font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible gambling */}
      <section className="border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 text-xs font-medium tracking-wide mb-6">
              RESPONSIBLE USE
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Built Responsibly
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              BetBrain is an analytics tool, not a sportsbook. We don&apos;t take bets, we don&apos;t guarantee outcomes, and we don&apos;t encourage reckless wagering. Our insights are for informational purposes only.
            </p>
            <p className="text-sm text-zinc-500 leading-relaxed border-l-2 border-zinc-700 pl-4">
              If you or someone you know has a gambling problem, call{' '}
              <span className="text-zinc-300 font-medium">1-800-GAMBLER</span>.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to find value?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            Start with a free account. No credit card required. 3 AI analyses per day included.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            {/* Brand + disclaimer */}
            <div className="max-w-lg">
              <div className="text-sm font-semibold text-white mb-2">
                BetBrain
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                BetBrain provides analytics and insights only. We do not
                facilitate gambling or accept wagers of any kind. All content is
                for informational purposes only and does not constitute financial
                or gambling advice. If you or someone you know has a gambling
                problem, call{' '}
                <span className="text-zinc-500">1-800-GAMBLER</span>.
              </p>
            </div>

            {/* Links */}
            <nav className="flex flex-row sm:flex-col gap-3 sm:gap-2 text-sm shrink-0">
              <Link
                href="/"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/login"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Sign Up
              </Link>
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-900 text-xs text-zinc-700">
            &copy; {new Date().getFullYear()} BetBrain. Analytics and insights
            only.
          </div>
        </div>
      </footer>
    </div>
  )
}
