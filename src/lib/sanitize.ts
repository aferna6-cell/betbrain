/**
 * Input sanitization for user-submitted text.
 * Trims whitespace, enforces length limits, strips control characters.
 */

/** Strip ASCII control characters (0x00-0x1F except tab/newline, 0x7F) */
function stripControlChars(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Sanitize a short text field (display name, team name, etc.)
 * Trims, strips control chars, enforces max length. Returns null if empty.
 */
export function sanitizeShortText(
  input: string | null | undefined,
  maxLength: number = 50
): string | null {
  if (!input) return null
  const cleaned = stripControlChars(input.trim())
  if (cleaned.length === 0) return null
  return cleaned.slice(0, maxLength)
}

/**
 * Sanitize a longer text field (notes, comments).
 * Same as short but with higher default limit.
 */
export function sanitizeLongText(
  input: string | null | undefined,
  maxLength: number = 500
): string | null {
  if (!input) return null
  const cleaned = stripControlChars(input.trim())
  if (cleaned.length === 0) return null
  return cleaned.slice(0, maxLength)
}
