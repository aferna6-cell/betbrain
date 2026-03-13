import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getStripeWebhookSecret } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    )
  } catch (err) {
    console.error('[stripe] Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id

      if (!userId) {
        console.error('[stripe] No supabase_user_id in checkout session metadata')
        break
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 'pro',
          stripe_subscription_id: session.subscription as string,
        })
        .eq('id', userId)

      if (error) {
        console.error('[stripe] Failed to upgrade user:', error.message)
      } else {
        console.log(`[stripe] User ${userId} upgraded to Pro`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Find user by stripe_customer_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', (profile as { id: string }).id)

        if (error) {
          console.error('[stripe] Failed to downgrade user:', error.message)
        } else {
          console.log(`[stripe] User ${(profile as { id: string }).id} downgraded to Free`)
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        const tier = subscription.status === 'active' ? 'pro' : 'free'
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('id', (profile as { id: string }).id)

        if (error) {
          console.error('[stripe] Failed to update subscription status:', error.message)
        }
      }
      break
    }

    default:
      // Unhandled event type — log but don't error
      console.log(`[stripe] Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
