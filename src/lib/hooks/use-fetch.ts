'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic fetch hook with loading, error, and refetch support.
 *
 * @param url - The API endpoint to fetch
 * @param options - Optional: { immediate: false } to skip initial fetch
 * @returns { data, loading, error, refetch }
 */
export function useFetch<T>(
  url: string,
  options?: { immediate?: boolean }
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(options?.immediate !== false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Request failed (${res.status})`)
        return
      }
      const json = await res.json()
      setData(json as T)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (options?.immediate !== false) {
      fetchData()
    }
  }, [fetchData, options?.immediate])

  return { data, loading, error, refetch: fetchData }
}
