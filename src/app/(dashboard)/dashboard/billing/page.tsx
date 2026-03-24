import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Usage — BetBrain',
  description: 'View your BetBrain usage stats.',
}

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usage</h1>
        <p className="mt-1 text-muted-foreground">
          Personal tool — all features are unlimited.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-bold mb-2">Personal License</h2>
        <p className="text-muted-foreground text-sm">
          BetBrain is configured as a personal analytics tool. All AI analyses,
          signals, and features are available without limits. API call caching
          keeps you within free-tier rate limits for external data sources.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">+</span>
            <span>Unlimited AI analyses</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">+</span>
            <span>All sports coverage</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">+</span>
            <span>Smart Signals, +EV scanner, arbitrage detection</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">+</span>
            <span>Line movement alerts</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">+</span>
            <span>Auto-resolve picks</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
