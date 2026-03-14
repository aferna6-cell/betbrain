/**
 * Onboarding email content generators.
 *
 * Pure functions — no API calls, no async. These return static content
 * shaped for rendering in the preview component and (eventually) sending
 * via Resend.
 *
 * Sequence timing:
 *   Day 0 — Welcome
 *   Day 2 — Tutorial
 *   Day 5 — Pro nudge
 */

export interface EmailContent {
  subject: string
  previewText: string
  heading: string
  body: string[]
  ctaText: string
  ctaUrl: string
  footer: string
}

const RESPONSIBLE_GAMBLING_DISCLAIMER =
  'BetBrain provides sports analytics and data insights for informational purposes only. ' +
  'Nothing on BetBrain constitutes financial, legal, or gambling advice. ' +
  'Please gamble responsibly. If gambling is causing harm, visit ncpgambling.org or call 1-800-522-4700.'

const STANDARD_FOOTER =
  `${RESPONSIBLE_GAMBLING_DISCLAIMER} ` +
  'You are receiving this email because you signed up for BetBrain. ' +
  'To unsubscribe, visit your account settings.'

export function getWelcomeEmail(userName: string): EmailContent {
  return {
    subject: 'Welcome to BetBrain — your AI-powered edge',
    previewText: "You're in. Here's how to get the most out of BetBrain starting today.",
    heading: `Welcome to BetBrain, ${userName}.`,
    body: [
      "You now have access to AI-powered sports analytics built for serious bettors. BetBrain doesn't pick games for you — it surfaces the data that helps you make smarter decisions.",
      "Here's what's available to you right now:",
      "Odds comparison — see moneyline odds across every major sportsbook side-by-side. Spot the best number before you place. Line shopping is one of the highest-ROI habits a bettor can build.",
      "AI analysis — get a structured breakdown of any game: key factors, value assessment, risk level, and a confidence rating. Powered by Claude, updated as odds shift.",
      "Smart Signals — BetBrain automatically flags games where multiple indicators align: sharp line movement, bookmaker variance, and AI confidence all pointing the same direction.",
      "To get started, head to your dashboard, pick a league, and pull up today's games. Check the Smart Signals section first — that's where we surface the highest-confidence opportunities.",
    ],
    ctaText: 'Go to Dashboard',
    ctaUrl: '/dashboard',
    footer: STANDARD_FOOTER,
  }
}

export function getTutorialEmail(userName: string): EmailContent {
  return {
    subject: '3 ways to find value with BetBrain',
    previewText: 'Smart Signals, line shopping, and pick tracking — the three habits that move the needle.',
    heading: `3 habits that separate sharp bettors, ${userName}.`,
    body: [
      'Most bettors lose because they rely on gut feel and skip the process. Here are three concrete ways BetBrain helps you build a data-driven edge.',
      'Tip 1: Check Smart Signals every day. BetBrain scans all available games and surfaces ones where AI confidence, bookmaker variance, and line movement all agree. These are not guaranteed winners — but they are the games where the data is loudest. Make it part of your morning routine.',
      "Tip 2: Use odds comparison to line shop. A three-point difference on a moneyline (+150 vs +153 vs +160) is not noise — over hundreds of bets, taking the best available number adds meaningful EV. BetBrain's odds grid shows every book at once so you never leave value on the table.",
      'Tip 3: Track your picks for accountability. Use BetBrain\'s pick tracker to log every bet you consider — win, loss, or no-action. Reviewing your own record over time is the fastest way to identify which bet types you actually have an edge in (and which ones you should drop).',
      "All three features are free to use right now. Head to your dashboard and check today's Smart Signals.",
    ],
    ctaText: "Check Today's Signals",
    ctaUrl: '/dashboard/signals',
    footer: STANDARD_FOOTER,
  }
}

export function getProNudgeEmail(userName: string): EmailContent {
  return {
    subject: 'Unlock unlimited AI analysis',
    previewText: "You've hit the free tier limit. Here's what Pro unlocks.",
    heading: `You're leaving analysis on the table, ${userName}.`,
    body: [
      "On the free tier, you get 3 AI analyses per day. That's enough to get a feel for the product — but on a big slate, you'll hit the limit fast.",
      'BetBrain Pro removes the cap and unlocks the full feature set:',
      'Unlimited AI game analyses — run as many as you need on any slate, any sport. No daily counter watching.',
      'Line movement alerts — set a threshold and get notified the moment a line moves past it. Sharp money moves fast; alerts keep you ahead of it.',
      'Injury impact analysis — AI-powered assessment of how key injuries affect a game\'s outlook, updated as news breaks.',
      'Priority support — questions answered faster, bugs prioritized.',
      "Join 500+ bettors using BetBrain Pro to get more out of every slate. At $29/month, one good line-shop pays for the subscription.",
    ],
    ctaText: 'Upgrade to Pro — $29/mo',
    ctaUrl: '/dashboard/upgrade',
    footer: STANDARD_FOOTER,
  }
}

/**
 * Returns all three emails in sequence order (Day 0, Day 2, Day 5).
 */
export function getOnboardingSequence(userName: string): EmailContent[] {
  return [
    getWelcomeEmail(userName),
    getTutorialEmail(userName),
    getProNudgeEmail(userName),
  ]
}
