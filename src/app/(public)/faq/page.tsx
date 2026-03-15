import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ — BetBrain',
  description:
    'Frequently asked questions about BetBrain sports analytics platform.',
  openGraph: {
    title: 'FAQ — BetBrain',
    description: 'Frequently asked questions about BetBrain sports analytics.',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

const faqs: { question: string; answer: string }[] = [
  {
    question: 'What is BetBrain?',
    answer:
      'BetBrain is an AI-powered sports analytics platform that surfaces data-driven insights across NBA, NFL, MLB, and NHL. We aggregate live odds from major bookmakers, analyze matchups with Claude AI, and flag games where multiple indicators align for potential value. BetBrain is not a sportsbook — we provide analytics and information only.',
  },
  {
    question: 'Is BetBrain a sportsbook?',
    answer:
      'No. BetBrain does not accept bets, hold funds, or facilitate gambling transactions of any kind. We are an analytics and insights platform. Placing bets is done independently through licensed sportsbooks of your choosing.',
  },
  {
    question: 'What sports do you cover?',
    answer:
      'BetBrain currently covers four major professional sports leagues: NBA (basketball), NFL (football), MLB (baseball), and NHL (hockey). All leagues are available on the free tier with no additional setup required.',
  },
  {
    question: 'How does the AI analysis work?',
    answer:
      "Our AI engine is powered by Anthropic's Claude. When you request an analysis on any game, Claude evaluates the matchup context, current betting lines, statistical trends, and injury reports to produce a structured breakdown. Every analysis returns a summary, key factors, value assessment, risk level, and confidence score — consistent structured output, not freeform opinions.",
  },
  {
    question: 'What are Smart Signals?',
    answer:
      'Smart Signals are games where multiple independent indicators align simultaneously — for example, significant bookmaker line variance combined with a high-confidence AI value assessment. When these signals converge, we flag the game for closer attention. Smart Signals are available to Pro subscribers.',
  },
  {
    question: 'Is BetBrain free?',
    answer:
      'Yes, there is a free tier that includes 3 AI analyses per day, full odds comparison across all sports, and basic dashboard access. Pro is $29/month and includes unlimited AI analyses, Smart Signals, line movement alerts, and priority support.',
  },
  {
    question: 'What is the API tier?',
    answer:
      'The API tier ($49/month) provides programmatic access to BetBrain analysis. It is intended for developers and power users who want to integrate our analysis data into their own workflows, spreadsheets, or applications.',
  },
  {
    question: 'How accurate are the predictions?',
    answer:
      'BetBrain does not make predictions. We surface data-driven insights to help you make more informed decisions. Sports outcomes involve inherent uncertainty that no model can eliminate. All analysis on BetBrain is for informational purposes only and does not constitute gambling advice or a recommendation to place any wager.',
  },
  {
    question: 'How do you handle my data?',
    answer:
      'User data is stored securely in Supabase (PostgreSQL) with row-level security enforced at the database layer. Your picks, saved analyses, and account information are private and only accessible to your account. We do not sell user data to third parties.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Yes, you can cancel your subscription at any time from the Billing page in your dashboard. Cancellation takes effect at the end of your current billing period. You retain Pro access until the period ends.',
  },
  {
    question: 'What odds formats do you support?',
    answer:
      'BetBrain displays odds in American format (+150, -110) by default. You can toggle to decimal format from any odds display in the dashboard. The Odds Tools page also provides a full converter between American, decimal, and fractional formats.',
  },
  {
    question: 'How often are odds updated?',
    answer:
      'Odds are fetched from The Odds API and cached in our database. The cache refreshes approximately every 5 minutes for active markets. If you see a "stale data" notice, it means the most recent API fetch has not completed yet — the displayed odds are the last known values.',
  },
]

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-white hover:text-zinc-200 transition-colors"
          >
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-20 sm:pb-14">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium tracking-wide mb-5">
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-4">
            Got questions?
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Everything you need to know about BetBrain — how it works, what it costs, and what it is (and isn&apos;t).
          </p>
        </div>
      </section>

      {/* FAQ list */}
      <section className="border-t border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="divide-y divide-zinc-800">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group py-0"
              >
                <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none select-none">
                  <span className="text-sm sm:text-base font-medium text-zinc-100 group-open:text-white">
                    {faq.question}
                  </span>
                  {/* Chevron */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 shrink-0 text-zinc-500 group-open:text-indigo-400 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <div className="pb-5 pr-8">
                  <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section className="border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Still have questions?
          </h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Check out How It Works for a deeper walkthrough, or sign up and explore the dashboard yourself.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium text-sm transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Responsible gambling notice */}
      <section className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <p className="text-sm text-zinc-500 leading-relaxed border-l-2 border-zinc-700 pl-4 max-w-2xl">
            BetBrain provides analytics and insights only. All analysis is for informational purposes only and does not constitute gambling advice. If you or someone you know has a gambling problem, call{' '}
            <span className="text-zinc-300 font-medium">1-800-GAMBLER</span>.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="max-w-lg">
              <div className="text-sm font-semibold text-white mb-2">BetBrain</div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                BetBrain provides analytics and insights only. We do not facilitate gambling or accept wagers of any kind. All content is for informational purposes only and does not constitute financial or gambling advice. If you or someone you know has a gambling problem, call{' '}
                <span className="text-zinc-500">1-800-GAMBLER</span>.
              </p>
            </div>
            <nav className="flex flex-row sm:flex-col gap-3 sm:gap-2 text-sm shrink-0">
              <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">Home</Link>
              <Link href="/how-it-works" className="text-zinc-500 hover:text-zinc-300 transition-colors">How It Works</Link>
              <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">Dashboard</Link>
              <Link href="/login" className="text-zinc-500 hover:text-zinc-300 transition-colors">Log In</Link>
              <Link href="/signup" className="text-zinc-500 hover:text-zinc-300 transition-colors">Sign Up</Link>
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
