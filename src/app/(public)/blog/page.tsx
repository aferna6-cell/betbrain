import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog — BetBrain',
  description: 'Sports betting analytics insights, guides, and strategies from BetBrain.',
}

const posts = [
  {
    slug: 'ai-sports-betting-analytics',
    title: 'AI Sports Betting Analytics in 2026: How Machine Learning Is Changing the Game',
    description:
      'AI models now process thousands of data points per game in real time — team stats, injury reports, line movement, historical matchups. Here\'s what that means for bettors looking for an edge.',
    date: 'March 14, 2026',
  },
  {
    slug: 'how-to-find-value-in-betting-lines',
    title: 'How to Find Value in Betting Lines: A Data-Driven Guide',
    description:
      'Value betting is the foundation of long-term profitability. This guide breaks down implied probability, line shopping, and how to read market movement to identify when a line is off.',
    date: 'March 14, 2026',
  },
]

export default function BlogIndexPage() {
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

      {/* Header */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium tracking-wide mb-6">
            BETBRAIN BLOG
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Insights & Guides
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-xl">
            Data-driven analysis, strategy breakdowns, and how-tos from the BetBrain team.
          </p>
        </div>
      </section>

      {/* Article list */}
      <section className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-3xl flex flex-col gap-5">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sm:p-8 hover:border-zinc-700 transition-colors"
              >
                <p className="text-xs text-zinc-500 mb-3 tabular-nums">{post.date}</p>
                <h2 className="text-lg sm:text-xl font-semibold text-white leading-snug mb-3">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-indigo-400 transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                  {post.description}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Read more &rarr;
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

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
              <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                Dashboard
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
