import { describe, it, expect } from 'vitest'
import { sanitizeShortText, sanitizeLongText } from '@/lib/sanitize'

describe('sanitizeShortText', () => {
  it('returns null for null/undefined/empty', () => {
    expect(sanitizeShortText(null)).toBeNull()
    expect(sanitizeShortText(undefined)).toBeNull()
    expect(sanitizeShortText('')).toBeNull()
    expect(sanitizeShortText('   ')).toBeNull()
  })

  it('trims whitespace', () => {
    expect(sanitizeShortText('  hello  ')).toBe('hello')
  })

  it('enforces max length', () => {
    const long = 'a'.repeat(100)
    expect(sanitizeShortText(long, 50)!.length).toBe(50)
  })

  it('strips control characters', () => {
    expect(sanitizeShortText('hello\x00world')).toBe('helloworld')
    expect(sanitizeShortText('test\x1Fvalue')).toBe('testvalue')
  })

  it('preserves normal text', () => {
    expect(sanitizeShortText('John Doe')).toBe('John Doe')
  })

  it('preserves unicode', () => {
    expect(sanitizeShortText('Héllo Wörld')).toBe('Héllo Wörld')
  })

  it('default max length is 50', () => {
    const long = 'a'.repeat(60)
    expect(sanitizeShortText(long)!.length).toBe(50)
  })
})

describe('sanitizeLongText', () => {
  it('returns null for empty input', () => {
    expect(sanitizeLongText(null)).toBeNull()
    expect(sanitizeLongText('')).toBeNull()
  })

  it('default max length is 500', () => {
    const long = 'x'.repeat(600)
    expect(sanitizeLongText(long)!.length).toBe(500)
  })

  it('trims and strips control chars', () => {
    expect(sanitizeLongText('  note\x00text  ')).toBe('notetext')
  })

  it('preserves newlines and tabs', () => {
    // newlines and tabs are not control chars we strip
    expect(sanitizeLongText('line1\nline2')).toBe('line1\nline2')
  })
})
