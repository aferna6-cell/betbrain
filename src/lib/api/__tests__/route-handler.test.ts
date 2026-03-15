/**
 * Route handler utility tests.
 *
 * Tests the pure helper functions: badRequest, routeErrorResponse.
 * withAuthenticatedRoute is integration-level (needs Supabase mock) — skipped.
 */

import { describe, it, expect } from 'vitest'
import { badRequest, routeErrorResponse } from '@/lib/api/route-handler'

describe('badRequest', () => {
  it('returns 400 status', () => {
    const response = badRequest('missing field')
    expect(response.status).toBe(400)
  })

  it('returns JSON body with error message', async () => {
    const response = badRequest('gameId is required')
    const body = await response.json()
    expect(body.error).toBe('gameId is required')
  })

  it('returns different messages correctly', async () => {
    const r1 = badRequest('sport must be one of: nba, nfl, mlb, nhl')
    const b1 = await r1.json()
    expect(b1.error).toContain('sport must be')

    const r2 = badRequest('threshold must be a number')
    const b2 = await r2.json()
    expect(b2.error).toBe('threshold must be a number')
  })
})

describe('routeErrorResponse', () => {
  it('returns 500 status', () => {
    const response = routeErrorResponse('test-context', new Error('boom'))
    expect(response.status).toBe(500)
  })

  it('includes context in error message but not internal details', async () => {
    const response = routeErrorResponse('create-pick', new Error('DB constraint violated'))
    const body = await response.json()
    expect(body.error).toContain('create-pick')
    expect(body.error).not.toContain('DB constraint')
    expect(body.error).not.toContain('violated')
  })

  it('handles non-Error objects', () => {
    const response = routeErrorResponse('test', 'string error')
    expect(response.status).toBe(500)
  })

  it('handles null/undefined errors', () => {
    const r1 = routeErrorResponse('test', null)
    expect(r1.status).toBe(500)

    const r2 = routeErrorResponse('test', undefined)
    expect(r2.status).toBe(500)
  })
})
