import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — BetBrain',
  description: 'How BetBrain collects, uses, and protects your data.',
  robots: { index: true, follow: true },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to BetBrain
        </Link>
        <h1 className="mt-4 text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 2026</p>
      </div>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <Section title="What we collect">
          <p>When you create an account, we collect your email address and a hashed password. We do not store plaintext passwords — authentication is handled by Supabase Auth.</p>
          <p>When you use the dashboard, we store your picks, saved analyses, alert rules, and bankroll configuration. This data is tied to your account and not shared with third parties.</p>
        </Section>

        <Section title="How we use your data">
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and improve the BetBrain analytics dashboard</li>
            <li>Calculate your pick statistics, CLV, ROI, and bankroll metrics</li>
            <li>Personalize your experience (onboarding, What&apos;s New)</li>
            <li>Process payments via Stripe (we never see your card details)</li>
            <li>Send transactional emails (account confirmation, password reset)</li>
          </ul>
        </Section>

        <Section title="Third-party services">
          <p>We use the following services that may process your data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Supabase</strong> — Database and authentication</li>
            <li><strong className="text-foreground">Vercel</strong> — Hosting and edge delivery</li>
            <li><strong className="text-foreground">Stripe</strong> — Payment processing (PCI compliant)</li>
            <li><strong className="text-foreground">Anthropic</strong> — AI analysis via Claude API (game data only, not personal data)</li>
          </ul>
          <p>We do not sell, rent, or share your personal information with advertisers or data brokers.</p>
        </Section>

        <Section title="Data storage and security">
          <p>Your data is stored in Supabase (PostgreSQL) with row-level security (RLS) enforced at the database layer. Only you can access your picks, analyses, and account data.</p>
          <p>All connections use HTTPS/TLS encryption. Security headers (CSP, HSTS, X-Frame-Options) are applied to all responses.</p>
        </Section>

        <Section title="Cookies and local storage">
          <p>We use cookies for authentication session management (Supabase Auth). We use localStorage for non-sensitive UI preferences:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Theme preference (dark/light)</li>
            <li>Onboarding checklist progress</li>
            <li>What&apos;s New banner dismissal</li>
            <li>Bankroll configuration</li>
            <li>Game watchlist</li>
          </ul>
          <p>We do not use tracking cookies, analytics pixels, or third-party advertising scripts.</p>
        </Section>

        <Section title="Your rights">
          <p>You can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access all your data from the dashboard (picks, analyses, profile)</li>
            <li>Delete individual picks from the Pick Tracker</li>
            <li>Delete your account by contacting support</li>
            <li>Export your pick data (copy stats feature)</li>
          </ul>
        </Section>

        <Section title="Children">
          <p>BetBrain is intended for users who are of legal age to participate in sports betting in their jurisdiction. We do not knowingly collect data from minors.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>We may update this policy from time to time. Material changes will be announced on the dashboard. The &quot;Last updated&quot; date at the top indicates when the policy was last revised.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this privacy policy? Visit our <Link href="/faq" className="text-indigo-400 hover:underline">FAQ</Link> or reach out via the feedback options in your dashboard.</p>
        </Section>
      </div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        For informational purposes only. BetBrain is an analytics tool, not a sportsbook.
      </p>
    </div>
  )
}
