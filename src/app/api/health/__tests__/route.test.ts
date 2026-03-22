/**
 * Health check API route tests.
 *
 * Tests env var detection, response shape. Public endpoint (no auth).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Module mocks -----------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}))

const { GET } = await import('../route')

// --- Tests ------------------------------------------------------------------

describe('GET /api/health — response shape', () => {
  const savedEnv = { ...process.env }

  afterEach(() => {
    // Restore env
    process.env = { ...savedEnv }
  })

  it('returns status, configured, checks, database, and timestamp', async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('configured')
    expect(body).toHaveProperty('checks')
    expect(body).toHaveProperty('database')
    expect(body).toHaveProperty('timestamp')
  })

  it('reports missing when env vars not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ODDS_API_KEY
    delete process.env.THE_ODDS_API_KEY

    const res = await GET()
    const body = await res.json()

    expect(body.checks.anthropic_key).toBe('missing')
    expect(body.checks.odds_api_key).toBe('missing')
  })

  it('reports ok when env vars are set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    process.env.ODDS_API_KEY = 'test'

    const res = await GET()
    const body = await res.json()

    expect(body.checks.anthropic_key).toBe('ok')
    expect(body.checks.odds_api_key).toBe('ok')
  })

  it('status is degraded when not all env vars configured', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await GET()
    const body = await res.json()
    expect(body.status).toBe('degraded')
  })

  it('configured shows fraction format', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.configured).toMatch(/^\d+\/\d+$/)
  })

  it('never exposes actual env var values', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-secret-value'
    const res = await GET()
    const text = JSON.stringify(await res.json())
    expect(text).not.toContain('sk-secret')
  })
})
