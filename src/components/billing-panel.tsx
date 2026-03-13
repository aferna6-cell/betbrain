'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface BillingPanelProps {
  tier: 'free' | 'pro'
  hasSubscription: boolean
}

const FREE_FEATURES = [
  '3 AI analyses per day',
  'All sports coverage',
  'Odds comparison',
  'Basic dashboard',
]

const PRO_FEATURES = [
  'Unlimited AI analyses',
  'All sports coverage',
  'Odds comparison',
  'Smart Signals (coming soon)',
  'Line movement alerts (coming soon)',
  'Priority support',
]

export function BillingPanel({ tier, hasSubscription }: BillingPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Failed to create checkout session')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Free Tier */}
      <div
        className={`rounded-lg border p-6 ${
          tier === 'free'
            ? 'border-primary bg-card'
            : 'border-border bg-card/50'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Free</h2>
          {tier === 'free' && <Badge variant="secondary">Current Plan</Badge>}
        </div>
        <p className="mb-6 text-3xl font-bold">
          $0<span className="text-sm font-normal text-muted-foreground">/month</span>
        </p>
        <ul className="space-y-2">
          {FREE_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-muted-foreground">+</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pro Tier */}
      <div
        className={`rounded-lg border p-6 ${
          tier === 'pro'
            ? 'border-primary bg-card'
            : 'border-border bg-card/50'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Pro</h2>
          {tier === 'pro' && <Badge variant="secondary">Current Plan</Badge>}
        </div>
        <p className="mb-6 text-3xl font-bold">
          $29<span className="text-sm font-normal text-muted-foreground">/month</span>
        </p>
        <ul className="mb-6 space-y-2">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-green-500">+</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {tier === 'free' && (
          <div>
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Loading...' : 'Upgrade to Pro'}
            </Button>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>
        )}

        {tier === 'pro' && hasSubscription && (
          <p className="text-sm text-muted-foreground">
            To cancel or manage your subscription, contact support.
          </p>
        )}
      </div>
    </div>
  )
}
