/**
 * Inline tooltip for betting terminology.
 * Renders a dotted-underline term that shows a definition on hover.
 * Pure CSS — no JS state needed.
 */

const TERMS: Record<string, string> = {
  CLV: 'Closing Line Value — the difference between your bet odds and the closing line. Positive CLV = long-term edge.',
  'Implied Probability': 'The win probability implied by the odds. -110 = 52.4% implied.',
  ROI: 'Return on Investment — your profit as a percentage of total wagered.',
  EV: 'Expected Value — average profit per bet over time. +EV = profitable.',
  Units: 'Standardized bet size. 1 unit = your standard wager amount.',
  Vig: "The bookmaker's built-in commission on odds.",
  Kelly: 'Kelly Criterion — a formula for optimal bet sizing based on edge.',
  Drawdown: 'Peak-to-trough decline in your bankroll.',
  Moneyline: 'A bet on which team wins outright.',
  Spread: 'A bet on the margin of victory.',
}

export function TermTooltip({
  term,
  children,
}: {
  term: keyof typeof TERMS | string
  children?: React.ReactNode
}) {
  const definition = TERMS[term]
  if (!definition) return <>{children ?? term}</>

  return (
    <span className="group relative inline-block cursor-help border-b border-dotted border-muted-foreground/40">
      {children ?? term}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-border bg-zinc-900 px-3 py-2 text-xs text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {definition}
      </span>
    </span>
  )
}

export { TERMS }
