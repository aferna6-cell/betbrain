import { createClient } from '@/lib/supabase/server'
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
    .select('subscription_tier, stripe_customer_id, stripe_subscription_id')
    .eq('id', user!.id)
    .single()

  const profile = data as Pick<
    Profile,
    'subscription_tier' | 'stripe_customer_id' | 'stripe_subscription_id'
  > | null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      <BillingPanel
        tier={profile?.subscription_tier ?? 'free'}
        hasSubscription={!!profile?.stripe_subscription_id}
      />
    </div>
  )
}
