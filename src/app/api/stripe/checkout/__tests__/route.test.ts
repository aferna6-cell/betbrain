/**
 * Stripe checkout API route tests.
 *
 * Tests POST /api/stripe/checkout — creates a Stripe Checkout session.
 * Mocks Stripe SDK, Supabase, and env helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

const FAKE_USER = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

const defaultResult = { data: null, error: null }

function makeCheckoutChain() {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn().mockResolvedValue(defaultResult)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResult))
  return chain
}

const chain = makeCheckoutChain()

const mockAuthClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    }),
  },
  from: chain.from,
}

const mockServiceClient = { from: chain.from }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockAuthClient),
  createServiceClient: vi.fn().mockResolvedValue(mockServiceClient),
}))

const mockCheckoutCreate = vi.fn().mockResolvedValue({
  url: 'https://checkout.stripe.com/test-session',
})

const mockCustomerCreate = vi.fn().mockResolvedValue({
  id: 'cus_new_123',
})

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: { create: mockCheckoutCreate },
    },
    customers: { create: mockCustomerCreate },
  })),
}))

vi.mock('@/lib/env', () => ({
  getStripePriceId: vi.fn(() => 'price_test_pro'),
  getSiteUrl: vi.fn(() => 'http://localhost:3000'),
}))

const { POST } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/stripe/checkout'

function makePostRequest(): Request {
  return new Request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

function resetMocks() {
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(defaultResult)
  ;(chain.then as ReturnType<typeof vi.fn>).mockImplementation(
    (resolve: (v: unknown) => void) => resolve(defaultResult)
  )
}

// --- Tests ------------------------------------------------------------------

describe('POST /api/stripe/checkout — auth', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const res = await POST(makePostRequest())
    expect(res.status).toBe(401)
  })
})

describe('POST /api/stripe/checkout — already Pro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetMocks()
  })

  it('returns 400 when user already on Pro plan', async () => {
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { subscription_tier: 'pro', stripe_customer_id: 'cus_existing' },
      error: null,
    })

    const res = await POST(makePostRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Already on Pro')
  })
})

describe('POST /api/stripe/checkout — free user, no existing customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetMocks()
  })

  it('creates Stripe customer and checkout session', async () => {
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { subscription_tier: 'free', stripe_customer_id: null },
      error: null,
    })

    const res = await POST(makePostRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://checkout.stripe.com/test-session')

    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: FAKE_USER.email,
        metadata: { supabase_user_id: FAKE_USER.id },
      })
    )

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_new_123',
        mode: 'subscription',
        line_items: [{ price: 'price_test_pro', quantity: 1 }],
      })
    )
  })
})

describe('POST /api/stripe/checkout — free user, existing customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetMocks()
  })

  it('reuses existing Stripe customer ID', async () => {
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { subscription_tier: 'free', stripe_customer_id: 'cus_existing_456' },
      error: null,
    })

    const res = await POST(makePostRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://checkout.stripe.com/test-session')

    // Should NOT create a new customer
    expect(mockCustomerCreate).not.toHaveBeenCalled()

    // Checkout session uses existing customer
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing_456',
      })
    )
  })
})

describe('POST /api/stripe/checkout — response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetMocks()
  })

  it('returns { url } on success', async () => {
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { subscription_tier: 'free', stripe_customer_id: 'cus_test' },
      error: null,
    })

    const res = await POST(makePostRequest())
    const body = await res.json()
    expect(body).toHaveProperty('url')
    expect(typeof body.url).toBe('string')
  })

  it('returns { error } when already Pro', async () => {
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { subscription_tier: 'pro', stripe_customer_id: 'cus_test' },
      error: null,
    })

    const res = await POST(makePostRequest())
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(typeof body.error).toBe('string')
  })
})

describe('POST /api/stripe/checkout — session config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
    resetMocks()
  })

  it('includes success and cancel URLs in session config', async () => {
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { subscription_tier: 'free', stripe_customer_id: 'cus_test' },
      error: null,
    })

    await POST(makePostRequest())

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/dashboard/billing'),
        cancel_url: expect.stringContaining('/dashboard/billing'),
      })
    )
  })
})
