/**
 * Digest API route tests.
 *
 * Tests GET preview and POST send, response shapes, auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FAKE_USER,
  createMockSupabaseClient,
  makeGetRequest,
  makeRequest,
} from '../../__tests__/mock-supabase'

// --- Module mocks -----------------------------------------------------------

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockClient),
  createServiceClient: vi.fn().mockResolvedValue(mockClient),
}))

const mockGenerateDigest = vi.fn()
const mockFormatDigestText = vi.fn()
const mockSendDigestEmail = vi.fn()

vi.mock('@/lib/digest', () => ({
  generateDigest: (...args: unknown[]) => mockGenerateDigest(...args),
  formatDigestText: (...args: unknown[]) => mockFormatDigestText(...args),
  sendDigestEmail: (...args: unknown[]) => mockSendDigestEmail(...args),
}))

const { GET, POST } = await import('../route')

// --- Helpers ----------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/digest'

const fakeDigest = {
  date: '2026-03-22',
  topGames: [],
  signals: [],
  yourWeek: null,
}

// --- Tests ------------------------------------------------------------------

describe('GET /api/digest — preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns digest with text preview', async () => {
    mockGenerateDigest.mockResolvedValue(fakeDigest)
    mockFormatDigestText.mockReturnValue('Today: 3 games...')

    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.date).toBe('2026-03-22')
    expect(body.textPreview).toBe('Today: 3 games...')
    expect(body.topGames).toEqual([])
  })

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const res = await GET(makeGetRequest(BASE_URL))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/digest — send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: FAKE_USER },
      error: null,
    })
  })

  it('returns message when email sending not configured', async () => {
    mockGenerateDigest.mockResolvedValue(fakeDigest)
    mockSendDigestEmail.mockResolvedValue({ sent: false })

    const res = await POST(makeRequest(BASE_URL, 'POST', {}))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.message).toContain('not yet configured')
    expect(body.digest).toBeDefined()
  })

  it('returns success message when email sends', async () => {
    mockGenerateDigest.mockResolvedValue(fakeDigest)
    mockSendDigestEmail.mockResolvedValue({ sent: true })

    const res = await POST(makeRequest(BASE_URL, 'POST', {}))
    const body = await res.json()
    expect(body.message).toContain('sent')
  })

  it('passes user email to sendDigestEmail', async () => {
    mockGenerateDigest.mockResolvedValue(fakeDigest)
    mockSendDigestEmail.mockResolvedValue({ sent: false })

    await POST(makeRequest(BASE_URL, 'POST', {}))
    expect(mockSendDigestEmail).toHaveBeenCalledWith('test@example.com', fakeDigest)
  })
})
