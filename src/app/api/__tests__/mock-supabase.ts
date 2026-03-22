/**
 * Shared mock helpers for API route tests.
 *
 * Provides a mock Supabase client factory and fake user for testing
 * route handlers that use withAuthenticatedRoute.
 */

import { vi } from 'vitest'

export const FAKE_USER = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

/**
 * Creates a chainable mock that returns data/error from the final call.
 * Supports .from().select().eq().order().limit().single() chains.
 */
function createChainMock(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve(result))
  // For non-single calls (select without .single()), make the chain itself thenable
  chain.then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

/**
 * Creates a mock Supabase client with auth that returns the fake user.
 * Override `fromResult` to control what .from() chains return.
 */
export function createMockSupabaseClient(
  fromResult: { data: unknown; error: unknown } = { data: null, error: null }
) {
  const chain = createChainMock(fromResult)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: FAKE_USER },
        error: null,
      }),
    },
    from: chain.from,
    _chain: chain,
  }
}

/**
 * Helper to create a Request object with JSON body.
 */
export function makeRequest(
  url: string,
  method: string,
  body?: unknown
): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new Request(url, init)
}

/**
 * Helper to create a Request with no body (for GET/DELETE with query params).
 */
export function makeGetRequest(url: string): Request {
  return new Request(url, { method: 'GET' })
}

export function makeDeleteRequest(url: string): Request {
  return new Request(url, { method: 'DELETE' })
}
