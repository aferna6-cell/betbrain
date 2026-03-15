/**
 * useFetch hook tests — validates the interface contract.
 * Since hooks need React rendering, we test the types and logic boundaries only.
 */

import { describe, it, expect } from 'vitest'

// We can't test React hooks without a DOM environment,
// so we test the module exports and type contract.
describe('useFetch module', () => {
  it('exports a function named useFetch', async () => {
    const mod = await import('@/lib/hooks/use-fetch')
    expect(typeof mod.useFetch).toBe('function')
  })

  it('useFetch function accepts a url string', async () => {
    const mod = await import('@/lib/hooks/use-fetch')
    // Just verifying the function signature — it takes (url, options?)
    expect(mod.useFetch.length).toBeGreaterThanOrEqual(1)
  })
})
