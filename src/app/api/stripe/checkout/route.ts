import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getStripePriceId, getSiteUrl } from '@/lib/env'
import { withAuthenticatedRoute } from '@/lib/api/route-handler'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function POST(request: Request) {
  return withAuthenticatedRoute(request, 'stripe-checkout', async ({ user }) => {
    const supabase = await createServiceClient()

    // Check if user already has Pro
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single()

    const profile = data as Pick<
      Profile,
      'subscription_tier' | 'stripe_customer_id'
    > | null

    if (profile?.subscription_tier === 'pro') {
      return NextResponse.json(
        { error: 'Already on Pro plan' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl()

    // Reuse or create Stripe customer
    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: getStripePriceId(),
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/billing`,
      metadata: { supabase_user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  })
}
