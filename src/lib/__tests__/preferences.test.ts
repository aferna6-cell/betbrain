import { describe, it, expect, beforeEach, vi } from 'vitest'

// We need to mock window + localStorage before importing the module
const store: Record<string, string> = {}

const fakeLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  length: 0,
  key: () => null,
}

// Ensure `typeof window !== 'undefined'` is true in test env
vi.stubGlobal('window', { localStorage: fakeLocalStorage })
vi.stubGlobal('localStorage', fakeLocalStorage)

// Import AFTER stubbing globals
const {
  getPreference,
  setPreference,
  removePreference,
  getPreferredBookmaker,
  setPreferredBookmaker,
} = await import('../preferences')

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
})

describe('getPreference', () => {
  it('returns null for missing key', () => {
    expect(getPreference('nonexistent')).toBeNull()
  })

  it('returns stored value', () => {
    store['betbrain-pref-test-key'] = 'test-value'
    expect(getPreference('test-key')).toBe('test-value')
  })
})

describe('setPreference', () => {
  it('stores value with prefix', () => {
    setPreference('my-key', 'my-value')
    expect(store['betbrain-pref-my-key']).toBe('my-value')
  })
})

describe('removePreference', () => {
  it('removes key', () => {
    store['betbrain-pref-my-key'] = 'val'
    removePreference('my-key')
    expect(store['betbrain-pref-my-key']).toBeUndefined()
  })
})

describe('getPreferredBookmaker', () => {
  it('returns null when not set', () => {
    expect(getPreferredBookmaker()).toBeNull()
  })

  it('returns stored bookmaker', () => {
    store['betbrain-pref-preferred-bookmaker'] = 'draftkings'
    expect(getPreferredBookmaker()).toBe('draftkings')
  })
})

describe('setPreferredBookmaker', () => {
  it('sets bookmaker', () => {
    setPreferredBookmaker('fanduel')
    expect(store['betbrain-pref-preferred-bookmaker']).toBe('fanduel')
  })

  it('removes bookmaker when null', () => {
    store['betbrain-pref-preferred-bookmaker'] = 'draftkings'
    setPreferredBookmaker(null)
    expect(store['betbrain-pref-preferred-bookmaker']).toBeUndefined()
  })
})
