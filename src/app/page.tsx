import type { Metadata } from 'next'
import Link from "next/link";

export const metadata: Metadata = {
  title: 'BetBrain — AI-Powered Sports Analytics',
  description: 'AI-driven sports analytics dashboard. Find value in betting lines across NBA, NFL, MLB, NHL with data-driven insights, Smart Signals, and line movement tracking.',
  keywords: ['sports analytics', 'AI betting analysis', 'NBA odds', 'NFL odds', 'MLB odds', 'NHL odds', 'line movement', 'smart signals'],
  openGraph: {
    title: 'BetBrain — AI-Powered Sports Analytics',
    description: 'Find value in betting lines with AI-driven insights across NBA, NFL, MLB, NHL.',
    type: 'website',
  },
}

const features = [
  {
    title: "Closing Line Value Tracking",
    description:
      "Track CLV on every pick you log. See whether you consistently beat the closing line — the single best predictor of long-term profitability.",
    tag: "Sharp edge metric",
  },
  {
    title: "Odds Comparison + Implied Probability",
    description:
      "Side-by-side bookmaker lines with implied probability displayed inline. Best available odds highlighted green. Spot when books disagree.",
    tag: "20+ bookmakers",
  },
  {
    title: "Bankroll Management",
    description:
      "Track your balance, max drawdown, and streaks. Kelly Criterion guidance for optimal unit sizing. Know exactly where your bankroll stands.",
    tag: "Units · ROI · Drawdown",
  },
  {
    title: "AI Game Analysis",
    description:
      "Claude-powered matchup breakdowns with structured output: summary, key factors, value assessment, risk level, and confidence score.",
    tag: "Powered by Claude",
  },
  {
    title: "Smart Signals + Line Alerts",
    description:
      "Get flagged when multiple indicators align on a game. Set alerts on moneyline, spread, and total movements across all bookmakers.",
    tag: "All 3 markets",
  },
  {
    title: "Multi-Sport Dashboard",
    description:
      "NBA, NFL, MLB, and NHL in one view. Pick tracking, backtesting, prop analysis, and parlay EV calculator — all in one place.",
    tag: "NBA · NFL · MLB · NHL",
  },
];

const freeTier = [
  "3 AI analyses per day",
  "Odds comparison + implied probability",
  "Pick tracker with CLV tracking",
  "Bankroll management dashboard",
  "All 4 sports (NBA, NFL, MLB, NHL)",
];

const proTier = [
  "Unlimited AI analyses",
  "Smart Signals (multi-factor consensus)",
  "Line alerts on moneyline, spread, totals",
  "Parlay EV calculator + prop analyzer",
  "Historical backtesting",
  "All Free tier features",
];

export default function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BetBrain',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    description:
      'AI-driven sports analytics dashboard. Find value in betting lines across NBA, NFL, MLB, NHL with data-driven insights.',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        name: 'Free',
        description: '3 AI analyses per day, odds comparison, all sports',
      },
      {
        '@type': 'Offer',
        price: '29',
        priceCurrency: 'USD',
        name: 'Pro',
        description: 'Unlimited analyses, Smart Signals, line movement alerts',
      },
    ],
    featureList: [
      'Closing Line Value (CLV) Tracking',
      'Odds Comparison with Implied Probability',
      'Bankroll Management with Kelly Criterion',
      'AI Game Analysis',
      'Smart Signals and Line Alerts',
      'Multi-Sport Coverage (NBA, NFL, MLB, NHL)',
      'Pick Tracking with ROI',
      'Parlay EV Calculator',
      'Historical Backtesting',
    ],
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav aria-label="Site navigation" className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-base font-semibold tracking-tight text-white">
            BetBrain
          </span>
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

      <main id="main-content">

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="max-w-3xl">
          {/* Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium tracking-wide mb-6">
            AI-POWERED SPORTS ANALYTICS
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Find edges the market{" "}
            <span className="text-indigo-400">hasn&apos;t corrected.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed max-w-2xl mb-10">
            BetBrain pairs live odds from every major bookmaker with Claude AI
            analysis to surface data-driven insights across NBA, NFL, MLB, and
            NHL — before the line moves.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
            >
              Get Started — Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium text-sm transition-colors"
            >
              Log In
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            No credit card required. Free tier includes 3 AI analyses per day.
          </p>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px border border-zinc-800 rounded-lg overflow-hidden bg-zinc-800">
          {[
            { value: "4", label: "Sports covered" },
            { value: "20+", label: "Bookmakers compared" },
            { value: "CLV", label: "Tracked per pick" },
            { value: "100%", label: "Analytics only" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900 px-5 py-5 sm:py-6"
            >
              <div className="text-2xl font-bold text-white tabular-nums">
                {stat.value}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Built for serious bettors
            </h2>
            <p className="text-zinc-400 max-w-xl">
              Not picks. Not hot takes. Structured data and AI reasoning so you
              can make your own informed decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-block text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full mb-4">
                  {feature.tag}
                </div>
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

      {/* How it works */}
      <section className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              How it works
            </h2>
            <p className="text-zinc-400 max-w-xl">
              From live data to structured insight in a few clicks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                step: "01",
                title: "Odds are fetched and cached",
                body: "Live lines from 20+ bookmakers are pulled via The Odds API and stored in our database. You see real-time market data without burning your own API quota.",
              },
              {
                step: "02",
                title: "Request an AI analysis",
                body: "Pick any game on the dashboard and request an analysis. Claude evaluates the matchup, the market lines, and recent team data to generate a structured breakdown.",
              },
              {
                step: "03",
                title: "Review the structured output",
                body: "Every analysis returns: a summary, key factors, a value assessment, a risk level, and a confidence score. No freeform opinions — consistent, comparable data.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <div className="text-3xl font-bold text-zinc-800 font-mono tabular-nums">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Straightforward pricing
            </h2>
            <p className="text-zinc-400 max-w-xl">
              Start free. Upgrade when you need deeper analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
            {/* Free tier */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-7 flex flex-col">
              <div className="mb-6">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                  Free
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-zinc-500 text-sm">/ month</span>
                </div>
                <p className="text-sm text-zinc-500 mt-2">
                  Everything you need to get started evaluating lines.
                </p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {freeTier.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border border-zinc-600 flex items-center justify-center text-zinc-400 text-[10px]">
                      +
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium text-sm transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro tier */}
            <div className="bg-zinc-900 border border-indigo-500/50 rounded-lg p-7 flex flex-col relative">
              <div className="absolute top-4 right-4 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                Most popular
              </div>

              <div className="mb-6">
                <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1">
                  Pro
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$29</span>
                  <span className="text-zinc-500 text-sm">/ month</span>
                </div>
                <p className="text-sm text-zinc-500 mt-2">
                  Unlimited analysis for serious, active bettors.
                </p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {proTier.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border border-indigo-500/50 bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-[10px]">
                      +
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
              >
                Start Pro Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      </main>

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
                problem, call{" "}
                <span className="text-zinc-500">1-800-GAMBLER</span>.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-row sm:flex-row gap-8 sm:gap-12 text-sm shrink-0">
              <nav aria-label="Product links" className="flex flex-col gap-2">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Product</span>
                <Link
                  href="/dashboard"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/how-it-works"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  href="/faq"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  FAQ
                </Link>
                <Link
                  href="/blog"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Blog
                </Link>
              </nav>
              <nav aria-label="Account links" className="flex flex-col gap-2">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Account</span>
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
                <Link
                  href="/disclaimer"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Legal
                </Link>
              </nav>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-900 text-xs text-zinc-700">
            &copy; {new Date().getFullYear()} BetBrain. Analytics and insights
            only.
          </div>
        </div>
      </footer>
    </div>
  );
}
