/**
 * Tests for API route handler helpers.
 * Tests the pure response-building functions (badRequest, routeErrorResponse).
 */

import { describe, it, expect, vi } from 'vitest'
import { badRequest, routeErrorResponse } from '@/lib/api/route-handler'

describe('badRequest', () => {
  it('returns 400 status', () => {
    const response = badRequest('Invalid input')
    expect(response.status).toBe(400)
  })

  it('returns JSON error body', async () => {
    const response = badRequest('Field is required')
    const body = await response.json()
    expect(body.error).toBe('Field is required')
  })
})

describe('routeErrorResponse', () => {
  it('returns 500 status', () => {
    // Suppress console.error during test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = routeErrorResponse('create-pick', new Error('DB timeout'))
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  it('returns generic error message without exposing internals', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = routeErrorResponse('create-pick', new Error('connection refused to 10.0.0.1'))
    const body = await response.json()
    expect(body.error).toBe('create-pick failed. Please try again later.')
    expect(body.error).not.toContain('10.0.0.1') // no internal details leaked
    spy.mockRestore()
  })

  it('logs the actual error to console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('secret internal error')
    routeErrorResponse('test-context', err)
    expect(spy).toHaveBeenCalledWith('[api] test-context failed:', err)
    spy.mockRestore()
  })
})
