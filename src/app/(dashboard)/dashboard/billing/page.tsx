import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Billing — BetBrain',
  description: 'Manage your BetBrain subscription.',
}
import { BillingPanel } from '@/components/billing-panel'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_customer_id, stripe_subscription_id, analyses_today')
    .eq('id', user!.id)
    .single()

  const profile = data as Pick<
    Profile,
    'subscription_tier' | 'stripe_customer_id' | 'stripe_subscription_id' | 'analyses_today'
  > | null

  const tier = profile?.subscription_tier ?? 'free'
  const analysesToday = profile?.analyses_today ?? 0
  const limit = tier === 'pro' ? null : 3

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {/* Daily quota display */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">AI Analyses Today</p>
          <p className="text-xl font-bold">
            {analysesToday}
            {limit !== null && (
              <span className="text-sm font-normal text-muted-foreground"> / {limit}</span>
            )}
            {limit === null && (
              <span className="ml-2 text-sm font-normal text-green-500">Unlimited</span>
            )}
          </p>
        </div>
        {limit !== null && analysesToday >= limit && (
          <span className="text-xs text-yellow-500">Daily limit reached — upgrade to Pro for unlimited</span>
        )}
      </div>

      <BillingPanel
        tier={tier}
        hasSubscription={!!profile?.stripe_subscription_id}
      />
    </div>
  )
}
