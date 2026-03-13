import Stripe from 'stripe'
import { getStripeSecretKey } from '@/lib/env'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getStripeSecretKey(), {
      apiVersion: '2026-02-25.clover',
    })
  }
  return stripeInstance
}

export const PRO_MONTHLY_PRICE = 2900 // $29.00 in cents
