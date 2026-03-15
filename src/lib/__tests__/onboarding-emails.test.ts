/**
 * Onboarding email generator unit tests.
 *
 * Validates EmailContent shape, sequence ordering, subject uniqueness,
 * user name personalisation, CTA presence, gambling disclaimer in every
 * footer, and content-specific assertions for each email.
 * Pure logic — no API calls, no async.
 */

import { describe, it, expect } from 'vitest'
import {
  getWelcomeEmail,
  getTutorialEmail,
  getProNudgeEmail,
  getOnboardingSequence,
} from '@/lib/onboarding-emails'
import type { EmailContent } from '@/lib/onboarding-emails'

const TEST_USER = 'Alex'

// Helper: assert an object has the full EmailContent shape
function assertEmailShape(email: EmailContent) {
  expect(typeof email.subject).toBe('string')
  expect(typeof email.previewText).toBe('string')
  expect(typeof email.heading).toBe('string')
  expect(Array.isArray(email.body)).toBe(true)
  expect(typeof email.ctaText).toBe('string')
  expect(typeof email.ctaUrl).toBe('string')
  expect(typeof email.footer).toBe('string')
}

// ---------------------------------------------------------------------------
// 1. getWelcomeEmail returns EmailContent
// ---------------------------------------------------------------------------

describe('getWelcomeEmail returns EmailContent', () => {
  it('has all required EmailContent fields', () => {
    assertEmailShape(getWelcomeEmail(TEST_USER))
  })

  it('subject is a non-empty string', () => {
    expect(getWelcomeEmail(TEST_USER).subject.length).toBeGreaterThan(0)
  })

  it('previewText is a non-empty string', () => {
    expect(getWelcomeEmail(TEST_USER).previewText.length).toBeGreaterThan(0)
  })

  it('body is a non-empty array', () => {
    expect(getWelcomeEmail(TEST_USER).body.length).toBeGreaterThan(0)
  })

  it('every body paragraph is a non-empty string', () => {
    for (const para of getWelcomeEmail(TEST_USER).body) {
      expect(typeof para).toBe('string')
      expect(para.length).toBeGreaterThan(0)
    }
  })

  it('footer is a non-empty string', () => {
    expect(getWelcomeEmail(TEST_USER).footer.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 2. getTutorialEmail returns EmailContent
// ---------------------------------------------------------------------------

describe('getTutorialEmail returns EmailContent', () => {
  it('has all required EmailContent fields', () => {
    assertEmailShape(getTutorialEmail(TEST_USER))
  })

  it('subject is a non-empty string', () => {
    expect(getTutorialEmail(TEST_USER).subject.length).toBeGreaterThan(0)
  })

  it('previewText is a non-empty string', () => {
    expect(getTutorialEmail(TEST_USER).previewText.length).toBeGreaterThan(0)
  })

  it('body is a non-empty array', () => {
    expect(getTutorialEmail(TEST_USER).body.length).toBeGreaterThan(0)
  })

  it('every body paragraph is a non-empty string', () => {
    for (const para of getTutorialEmail(TEST_USER).body) {
      expect(typeof para).toBe('string')
      expect(para.length).toBeGreaterThan(0)
    }
  })

  it('footer is a non-empty string', () => {
    expect(getTutorialEmail(TEST_USER).footer.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 3. getProNudgeEmail returns EmailContent
// ---------------------------------------------------------------------------

describe('getProNudgeEmail returns EmailContent', () => {
  it('has all required EmailContent fields', () => {
    assertEmailShape(getProNudgeEmail(TEST_USER))
  })

  it('subject is a non-empty string', () => {
    expect(getProNudgeEmail(TEST_USER).subject.length).toBeGreaterThan(0)
  })

  it('previewText is a non-empty string', () => {
    expect(getProNudgeEmail(TEST_USER).previewText.length).toBeGreaterThan(0)
  })

  it('body is a non-empty array', () => {
    expect(getProNudgeEmail(TEST_USER).body.length).toBeGreaterThan(0)
  })

  it('every body paragraph is a non-empty string', () => {
    for (const para of getProNudgeEmail(TEST_USER).body) {
      expect(typeof para).toBe('string')
      expect(para.length).toBeGreaterThan(0)
    }
  })

  it('footer is a non-empty string', () => {
    expect(getProNudgeEmail(TEST_USER).footer.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 4. getOnboardingSequence returns 3 emails in order
// ---------------------------------------------------------------------------

describe('getOnboardingSequence returns 3 emails in order', () => {
  it('returns an array of exactly 3 emails', () => {
    const seq = getOnboardingSequence(TEST_USER)
    expect(seq).toHaveLength(3)
  })

  it('first email is the welcome email', () => {
    const [first] = getOnboardingSequence(TEST_USER)
    expect(first.subject).toBe(getWelcomeEmail(TEST_USER).subject)
  })

  it('second email is the tutorial email', () => {
    const [, second] = getOnboardingSequence(TEST_USER)
    expect(second.subject).toBe(getTutorialEmail(TEST_USER).subject)
  })

  it('third email is the pro nudge email', () => {
    const [, , third] = getOnboardingSequence(TEST_USER)
    expect(third.subject).toBe(getProNudgeEmail(TEST_USER).subject)
  })

  it('every email in the sequence has the correct shape', () => {
    for (const email of getOnboardingSequence(TEST_USER)) {
      assertEmailShape(email)
    }
  })

  it('sequence matches individual generators', () => {
    const seq = getOnboardingSequence(TEST_USER)
    expect(seq[0]).toEqual(getWelcomeEmail(TEST_USER))
    expect(seq[1]).toEqual(getTutorialEmail(TEST_USER))
    expect(seq[2]).toEqual(getProNudgeEmail(TEST_USER))
  })
})

// ---------------------------------------------------------------------------
// 5. Email subjects are distinct
// ---------------------------------------------------------------------------

describe('Email subjects are distinct', () => {
  it('no two emails share the same subject', () => {
    const subjects = getOnboardingSequence(TEST_USER).map((e) => e.subject)
    expect(new Set(subjects).size).toBe(subjects.length)
  })

  it('welcome and tutorial subjects differ', () => {
    expect(getWelcomeEmail(TEST_USER).subject).not.toBe(getTutorialEmail(TEST_USER).subject)
  })

  it('welcome and pro nudge subjects differ', () => {
    expect(getWelcomeEmail(TEST_USER).subject).not.toBe(getProNudgeEmail(TEST_USER).subject)
  })

  it('tutorial and pro nudge subjects differ', () => {
    expect(getTutorialEmail(TEST_USER).subject).not.toBe(getProNudgeEmail(TEST_USER).subject)
  })
})

// ---------------------------------------------------------------------------
// 6. All emails include the user's name
// ---------------------------------------------------------------------------

describe('All emails include user name', () => {
  it('welcome email heading contains the user name', () => {
    const email = getWelcomeEmail(TEST_USER)
    const fullText = email.heading + email.body.join(' ')
    expect(fullText).toContain(TEST_USER)
  })

  it('tutorial email heading contains the user name', () => {
    const email = getTutorialEmail(TEST_USER)
    const fullText = email.heading + email.body.join(' ')
    expect(fullText).toContain(TEST_USER)
  })

  it('pro nudge email heading contains the user name', () => {
    const email = getProNudgeEmail(TEST_USER)
    const fullText = email.heading + email.body.join(' ')
    expect(fullText).toContain(TEST_USER)
  })

  it('user name is reflected correctly for a different name', () => {
    const otherName = 'Jordan'
    for (const email of getOnboardingSequence(otherName)) {
      expect(email.heading + email.body.join(' ')).toContain(otherName)
    }
  })

  it('emails for different user names are distinct', () => {
    const a = getWelcomeEmail('Alice')
    const b = getWelcomeEmail('Bob')
    expect(a.heading).not.toBe(b.heading)
  })
})

// ---------------------------------------------------------------------------
// 7. All emails have a CTA
// ---------------------------------------------------------------------------

describe('All emails have CTA', () => {
  it('welcome email ctaText is non-empty', () => {
    expect(getWelcomeEmail(TEST_USER).ctaText.length).toBeGreaterThan(0)
  })

  it('welcome email ctaUrl is non-empty', () => {
    expect(getWelcomeEmail(TEST_USER).ctaUrl.length).toBeGreaterThan(0)
  })

  it('tutorial email ctaText is non-empty', () => {
    expect(getTutorialEmail(TEST_USER).ctaText.length).toBeGreaterThan(0)
  })

  it('tutorial email ctaUrl is non-empty', () => {
    expect(getTutorialEmail(TEST_USER).ctaUrl.length).toBeGreaterThan(0)
  })

  it('pro nudge email ctaText is non-empty', () => {
    expect(getProNudgeEmail(TEST_USER).ctaText.length).toBeGreaterThan(0)
  })

  it('pro nudge email ctaUrl is non-empty', () => {
    expect(getProNudgeEmail(TEST_USER).ctaUrl.length).toBeGreaterThan(0)
  })

  it('all CTA URLs in the sequence are non-empty', () => {
    for (const email of getOnboardingSequence(TEST_USER)) {
      expect(email.ctaUrl.length).toBeGreaterThan(0)
      expect(email.ctaText.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 8. All emails have footer with gambling disclaimer
// ---------------------------------------------------------------------------

describe('All emails have footer with gambling disclaimer', () => {
  it('welcome email footer mentions responsible gambling', () => {
    const footer = getWelcomeEmail(TEST_USER).footer.toLowerCase()
    const hasKeyword = footer.includes('gambling') || footer.includes('responsible')
    expect(hasKeyword).toBe(true)
  })

  it('tutorial email footer mentions responsible gambling', () => {
    const footer = getTutorialEmail(TEST_USER).footer.toLowerCase()
    const hasKeyword = footer.includes('gambling') || footer.includes('responsible')
    expect(hasKeyword).toBe(true)
  })

  it('pro nudge email footer mentions responsible gambling', () => {
    const footer = getProNudgeEmail(TEST_USER).footer.toLowerCase()
    const hasKeyword = footer.includes('gambling') || footer.includes('responsible')
    expect(hasKeyword).toBe(true)
  })

  it('every email footer in the sequence mentions responsible gambling', () => {
    for (const email of getOnboardingSequence(TEST_USER)) {
      const footer = email.footer.toLowerCase()
      expect(footer.includes('gambling') || footer.includes('responsible')).toBe(true)
    }
  })

  it('footer includes informational purposes disclaimer', () => {
    for (const email of getOnboardingSequence(TEST_USER)) {
      expect(email.footer.toLowerCase()).toContain('informational purposes')
    }
  })

  it('all footers include an unsubscribe mention', () => {
    for (const email of getOnboardingSequence(TEST_USER)) {
      expect(email.footer.toLowerCase()).toContain('unsubscribe')
    }
  })
})

// ---------------------------------------------------------------------------
// 9. Welcome email CTA goes to dashboard
// ---------------------------------------------------------------------------

describe('Welcome email CTA', () => {
  it('ctaUrl points to /dashboard', () => {
    expect(getWelcomeEmail(TEST_USER).ctaUrl).toBe('/dashboard')
  })

  it('ctaText references the dashboard', () => {
    const ctaText = getWelcomeEmail(TEST_USER).ctaText.toLowerCase()
    expect(ctaText).toContain('dashboard')
  })
})

// ---------------------------------------------------------------------------
// 10. Pro nudge email content
// ---------------------------------------------------------------------------

describe('Pro nudge email content', () => {
  it('subject or body mentions Pro', () => {
    const email = getProNudgeEmail(TEST_USER)
    const fullText = (email.subject + ' ' + email.body.join(' ')).toLowerCase()
    expect(fullText.includes('pro') || fullText.includes('pricing')).toBe(true)
  })

  it('body mentions the daily analysis limit', () => {
    const bodyText = getProNudgeEmail(TEST_USER).body.join(' ').toLowerCase()
    // The free tier limit is 3 per day — should be called out in the upgrade pitch
    expect(bodyText).toContain('3')
  })

  it('ctaUrl points to the upgrade page', () => {
    expect(getProNudgeEmail(TEST_USER).ctaUrl).toContain('upgrade')
  })

  it('body or ctaText references a price', () => {
    const email = getProNudgeEmail(TEST_USER)
    const fullText = email.body.join(' ') + ' ' + email.ctaText
    // Price of $29 must be mentioned somewhere
    expect(fullText).toContain('29')
  })
})

// ---------------------------------------------------------------------------
// 11. Tutorial email content
// ---------------------------------------------------------------------------

describe('Tutorial email content', () => {
  it('body mentions Smart Signals', () => {
    const bodyText = getTutorialEmail(TEST_USER).body.join(' ').toLowerCase()
    expect(bodyText.includes('signals') || bodyText.includes('smart signals')).toBe(true)
  })

  it('body contains tips or advice (tip keyword)', () => {
    const bodyText = getTutorialEmail(TEST_USER).body.join(' ').toLowerCase()
    expect(bodyText.includes('tip') || bodyText.includes('habit')).toBe(true)
  })

  it('ctaUrl references signals or dashboard', () => {
    const url = getTutorialEmail(TEST_USER).ctaUrl.toLowerCase()
    expect(url.includes('signal') || url.includes('dashboard')).toBe(true)
  })

  it('body has at least 3 paragraphs covering different topics', () => {
    expect(getTutorialEmail(TEST_USER).body.length).toBeGreaterThanOrEqual(3)
  })
})
