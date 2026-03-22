/**
 * Stripe webhook API route tests.
 *
 * Tests POST /api/stripe/webhook — handles Stripe webhook events.
 * Mocks Stripe SDK (constructEvent), Supabase, and env helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

const defaultResult = { data: null, error: null }

function makeWebhookChain() {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn().mockResolvedValue(defaultResult)
  chain.maybeSingle = vi.fn().mockResolvedValue(defaultResult)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResult))
  return chain
}

const chain = makeWebhookChain()
const mockSupabase = { from: chain.from }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
  createServiceClient: vi.fn().mockResolvedValue(mockSupabase),
}))

const mockConstructEvent = vi.fn()

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  })),
}))

vi.mock('@/lib/env', () => ({
  getStripeWebhookSecret: vi.fn(() => 'whsec_test_secret'),
}))

const { POST } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/stripe/webhook'

function makeWebhookRequest(body: string, signature?: string): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (signature) {
    headers['stripe-signature'] = signature
  }
  return new Request(BASE_URL, {
    method: 'POST',
    headers,
    body,
  })
}

function makeStripeEvent(type: string, data: Record<string, unknown> = {}) {
  return {
    type,
    data: {
      object: data,
    },
  }
}

function resetChain() {
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(defaultResult)
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(defaultResult)
  ;(chain.then as ReturnType<typeof vi.fn>).mockImplementation(
    (resolve: (v: unknown) => void) => resolve(defaultResult)
  )
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/stripe/webhook — signature validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('stripe-signature')
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(makeWebhookRequest('{}', 'sig_invalid'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid signature')
  })

  it('passes body and signature to constructEvent', async () => {
    const event = makeStripeEvent('unknown.event')
    mockConstructEvent.mockReturnValueOnce(event)

    await POST(makeWebhookRequest('test-body', 'sig_test'))

    expect(mockConstructEvent).toHaveBeenCalledWith(
      'test-body',
      'sig_test',
      'whsec_test_secret'
    )
  })
})

describe('POST /api/stripe/webhook — checkout.session.completed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('upgrades user to Pro on successful checkout', async () => {
    const event = makeStripeEvent('checkout.session.completed', {
      metadata: { supabase_user_id: 'user-abc' },
      subscription: 'sub_test_123',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    // Update chain resolves without error
    ;(chain.then as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
    )

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_tier: 'pro',
        stripe_subscription_id: 'sub_test_123',
      })
    )
  })

  it('returns 500 when database update fails on checkout', async () => {
    const event = makeStripeEvent('checkout.session.completed', {
      metadata: { supabase_user_id: 'user-abc' },
      subscription: 'sub_test_123',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    ;(chain.then as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'DB error' } })
    )

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Database update failed')
  })

  it('handles missing supabase_user_id in metadata gracefully', async () => {
    const event = makeStripeEvent('checkout.session.completed', {
      metadata: {},
      subscription: 'sub_test_123',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })
})

describe('POST /api/stripe/webhook — customer.subscription.deleted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('downgrades user to free on subscription deletion', async () => {
    const event = makeStripeEvent('customer.subscription.deleted', {
      customer: 'cus_test_456',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    // maybeSingle returns the user profile
    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 'user-xyz' },
      error: null,
    })

    // Update succeeds
    ;(chain.then as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
    )

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(200)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_tier: 'free',
        stripe_subscription_id: null,
      })
    )
  })

  it('returns 500 when downgrade database update fails', async () => {
    const event = makeStripeEvent('customer.subscription.deleted', {
      customer: 'cus_test_456',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 'user-xyz' },
      error: null,
    })

    ;(chain.then as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'DB error' } })
    )

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Database update failed')
  })

  it('handles missing profile for customer gracefully', async () => {
    const event = makeStripeEvent('customer.subscription.deleted', {
      customer: 'cus_unknown',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })
})

describe('POST /api/stripe/webhook — customer.subscription.updated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('updates tier to pro when subscription is active', async () => {
    const event = makeStripeEvent('customer.subscription.updated', {
      customer: 'cus_test_789',
      status: 'active',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 'user-sub-upd' },
      error: null,
    })

    ;(chain.then as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
    )

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(200)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_tier: 'pro' })
    )
  })

  it('updates tier to free when subscription is not active', async () => {
    const event = makeStripeEvent('customer.subscription.updated', {
      customer: 'cus_test_789',
      status: 'past_due',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 'user-sub-upd' },
      error: null,
    })

    ;(chain.then as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
    )

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(200)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_tier: 'free' })
    )
  })

  it('returns 500 when subscription update DB write fails', async () => {
    const event = makeStripeEvent('customer.subscription.updated', {
      customer: 'cus_test_789',
      status: 'active',
    })
    mockConstructEvent.mockReturnValueOnce(event)

    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 'user-sub-upd' },
      error: null,
    })

    ;(chain.then as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'DB error' } })
    )

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/stripe/webhook — unhandled events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns 200 for unhandled event types', async () => {
    const event = makeStripeEvent('invoice.payment_succeeded', {})
    mockConstructEvent.mockReturnValueOnce(event)

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })
})

describe('POST /api/stripe/webhook — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('successful responses include { received: true }', async () => {
    const event = makeStripeEvent('unknown.event')
    mockConstructEvent.mockReturnValueOnce(event)

    const res = await POST(makeWebhookRequest('{}', 'sig_valid'))
    const body = await res.json()
    expect(body).toEqual({ received: true })
  })

  it('error responses include { error: string }', async () => {
    const res = await POST(makeWebhookRequest('{}'))
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(typeof body.error).toBe('string')
  })
})
