import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getKellyConfig,
  setKellyConfig,
  setKellyPreset,
  getBetKellyOverride,
  setBetKellyOverride,
  clearBetKellyOverride,
  getEffectiveKellyMultiplier,
  adjustedKelly,
  KELLY_PRESETS,
} from '../kelly-override'

// Mock localStorage
const mockStorage = new Map<string, string>()
vi.stubGlobal('window', {})
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
})

describe('Kelly Override', () => {
  beforeEach(() => {
    mockStorage.clear()
  })

  describe('KELLY_PRESETS', () => {
    it('has quarter preset at 0.25', () => {
      expect(KELLY_PRESETS.quarter.multiplier).toBe(0.25)
    })

    it('has half preset at 0.5', () => {
      expect(KELLY_PRESETS.half.multiplier).toBe(0.5)
    })

    it('has three-quarter preset at 0.75', () => {
      expect(KELLY_PRESETS['three-quarter'].multiplier).toBe(0.75)
    })

    it('has full preset at 1.0', () => {
      expect(KELLY_PRESETS.full.multiplier).toBe(1.0)
    })
  })

  describe('getKellyConfig / setKellyConfig', () => {
    it('returns default quarter Kelly when nothing stored', () => {
      const config = getKellyConfig()
      expect(config.preset).toBe('quarter')
      expect(config.multiplier).toBe(0.25)
    })

    it('persists and retrieves config', () => {
      setKellyConfig({ preset: 'half', multiplier: 0.5 })
      const config = getKellyConfig()
      expect(config.preset).toBe('half')
      expect(config.multiplier).toBe(0.5)
    })

    it('rejects invalid multiplier', () => {
      setKellyConfig({ preset: 'custom', multiplier: -1 })
      // Should fall back to default
      const config = getKellyConfig()
      expect(config.preset).toBe('quarter')
      expect(config.multiplier).toBe(0.25)
    })
  })

  describe('setKellyPreset', () => {
    it('sets quarter preset correctly', () => {
      const config = setKellyPreset('quarter')
      expect(config.multiplier).toBe(0.25)
      expect(config.preset).toBe('quarter')
    })

    it('sets full preset correctly', () => {
      const config = setKellyPreset('full')
      expect(config.multiplier).toBe(1.0)
    })

    it('sets custom with provided multiplier', () => {
      const config = setKellyPreset('custom', 0.33)
      expect(config.preset).toBe('custom')
      expect(config.multiplier).toBe(0.33)
    })

    it('clamps custom multiplier to valid range', () => {
      const config = setKellyPreset('custom', 5.0)
      expect(config.multiplier).toBe(2.0) // Max is 2.0

      const config2 = setKellyPreset('custom', 0.01)
      expect(config2.multiplier).toBe(0.1) // Min is 0.1
    })
  })

  describe('per-bet overrides', () => {
    it('returns null when no override exists', () => {
      expect(getBetKellyOverride('bet-123')).toBeNull()
    })

    it('sets and retrieves per-bet override', () => {
      setBetKellyOverride('bet-123', { preset: 'full', multiplier: 1.0 })
      const override = getBetKellyOverride('bet-123')
      expect(override).not.toBeNull()
      expect(override!.multiplier).toBe(1.0)
    })

    it('clears per-bet override', () => {
      setBetKellyOverride('bet-123', { preset: 'full', multiplier: 1.0 })
      clearBetKellyOverride('bet-123')
      expect(getBetKellyOverride('bet-123')).toBeNull()
    })

    it('maintains separate overrides per bet', () => {
      setBetKellyOverride('bet-1', { preset: 'quarter', multiplier: 0.25 })
      setBetKellyOverride('bet-2', { preset: 'full', multiplier: 1.0 })
      expect(getBetKellyOverride('bet-1')!.multiplier).toBe(0.25)
      expect(getBetKellyOverride('bet-2')!.multiplier).toBe(1.0)
    })
  })

  describe('getEffectiveKellyMultiplier', () => {
    it('returns global config when no bet ID', () => {
      setKellyPreset('half')
      expect(getEffectiveKellyMultiplier()).toBe(0.5)
    })

    it('returns per-bet override when available', () => {
      setKellyPreset('quarter')
      setBetKellyOverride('bet-123', { preset: 'full', multiplier: 1.0 })
      expect(getEffectiveKellyMultiplier('bet-123')).toBe(1.0)
    })

    it('falls back to global when no per-bet override', () => {
      setKellyPreset('half')
      expect(getEffectiveKellyMultiplier('nonexistent')).toBe(0.5)
    })
  })

  describe('adjustedKelly', () => {
    it('returns full multiplier at 100% confidence', () => {
      expect(adjustedKelly(0.5, 100)).toBe(0.5)
    })

    it('reduces multiplier at 50% confidence', () => {
      expect(adjustedKelly(1.0, 50)).toBe(0.5)
    })

    it('has minimum floor at 25% of multiplier', () => {
      expect(adjustedKelly(1.0, 10)).toBe(0.25)
      expect(adjustedKelly(1.0, 0)).toBe(0.25)
    })

    it('scales proportionally', () => {
      expect(adjustedKelly(0.5, 75)).toBe(0.38) // 0.5 * 0.75 = 0.375, rounded
    })
  })
})
