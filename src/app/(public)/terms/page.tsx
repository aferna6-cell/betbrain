import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — BetBrain',
  description: 'Terms and conditions for using BetBrain.',
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

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to BetBrain
        </Link>
        <h1 className="mt-4 text-4xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 2026</p>
      </div>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <Section title="1. Overview">
          <p>BetBrain is an AI-powered sports analytics platform. By creating an account or using our services, you agree to these terms.</p>
          <p><strong className="text-foreground">BetBrain is not a sportsbook.</strong> We do not accept bets, hold funds, or facilitate gambling transactions. We provide analytics and information only.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be of legal age in your jurisdiction to use BetBrain. Sports betting regulations vary by location — it is your responsibility to comply with local laws.</p>
        </Section>

        <Section title="3. Accounts">
          <p>You are responsible for maintaining the security of your account credentials. One account per person. Do not share your login.</p>
        </Section>

        <Section title="4. Subscriptions and payments">
          <p>BetBrain offers Free and Pro tiers. Pro subscriptions are billed monthly through Stripe. You can cancel anytime from the Billing page — cancellation takes effect at the end of the current billing period.</p>
          <p>Refunds are handled on a case-by-case basis. Contact support within 7 days of a charge for refund requests.</p>
        </Section>

        <Section title="5. No financial advice">
          <p>All analysis, insights, signals, and recommendations on BetBrain are <strong className="text-foreground">for informational purposes only</strong>. Nothing on this platform constitutes financial advice, gambling advice, or a recommendation to place any wager.</p>
          <p>Past performance (including backtesting results, CLV stats, and signal hit rates) does not guarantee future results. Sports outcomes involve inherent uncertainty.</p>
        </Section>

        <Section title="6. Acceptable use">
          <p>You may not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Scrape, crawl, or programmatically access BetBrain without an API subscription</li>
            <li>Redistribute BetBrain data or analysis commercially</li>
            <li>Attempt to circumvent rate limits or subscription restrictions</li>
            <li>Use the platform for any illegal purpose</li>
          </ul>
        </Section>

        <Section title="7. API access">
          <p>The API tier provides programmatic access under the same terms. API keys are personal and non-transferable. Abuse of API rate limits may result in access suspension.</p>
        </Section>

        <Section title="8. Data accuracy">
          <p>Odds data is sourced from third-party APIs and cached in our system. While we strive for accuracy, we cannot guarantee that all odds are current or error-free. Always verify odds at your chosen sportsbook before placing any wager.</p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>BetBrain is provided &quot;as is&quot; without warranties. We are not liable for any losses arising from the use of our analytics, including but not limited to gambling losses, missed opportunities, or data inaccuracies.</p>
        </Section>

        <Section title="10. Changes">
          <p>We may update these terms. Continued use after changes constitutes acceptance. Material changes will be communicated via the dashboard.</p>
        </Section>

        <Section title="11. Contact">
          <p>Questions? Visit our <Link href="/faq" className="text-indigo-400 hover:underline">FAQ</Link> or <Link href="/disclaimer" className="text-indigo-400 hover:underline">Legal Disclaimer</Link>.</p>
        </Section>
      </div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        For informational purposes only. BetBrain is an analytics tool, not a sportsbook.
      </p>
    </div>
  )
}
