# Customer Simulation: Parlay Builder

Date: 2026-03-22

## Persona
25-year-old sports bettor who builds 3-6 leg parlays weekly across NBA and NFL. Loves the +EV angle — wants to combine high-confidence picks into higher-payout parlays. Tracks ROI but focuses on parlay-level outcomes, not individual legs.

## Journey

1. **Dashboard** — Sees games across sports. Finds a Lakers game with -150 ML and a Chiefs game with +120 spread. Wants to combine them. Looks for "Add to Parlay" button on game card. → Not found. Has to navigate to separate parlay page.
2. **Parlay page** (/dashboard/parlay) — Clean form. Manually types "Lakers ML" and enters -150 odds. Types "Chiefs +3.5" and enters +120. Adds 2 more legs. → Works but tedious. Must remember odds from dashboard.
3. **Analysis results** — AI returns combined odds, implied probability, correlation warnings, EV estimate. Correlation check catches same-game legs. → Good analysis quality.
4. **EV Scanner** — Finds 4 +EV opportunities. Wants to combine them into a parlay. No "Combine" button. → Must manually re-enter in parlay builder.
5. **Smart Signals** — 3 strong signals. Same problem — no way to feed into parlay. → Manual re-entry.
6. **Pick tracker** — Wants to log the 4-leg parlay as a single bet. Pick form only accepts single-game picks. → Cannot track parlay as a unit. Must log 4 separate picks and mentally track the parlay.
7. **Analytics** — No parlay-specific stats. Can't see "My 3-leg parlays hit 25% this month." → No parlay performance data.

## Gaps Found

### Critical (workflow blockers)
1. **No "Add to Parlay" from game cards** — Biggest friction point. Bettor must manually transcribe odds from dashboard to parlay builder. Would be solved by a button that pre-populates a leg.
2. **No parlay pick tracking** — Can't log a parlay as a multi-leg bet. No parlay-level W/L/profit stats. Schema has no `parlay_id` concept.

### Important (value gaps)
3. **No signals/EV → parlay flow** — Can't build a parlay from +EV or signal recommendations.
4. **No break-even probability** — Bettor doesn't see the threshold probability needed for the parlay to be +EV.
5. **No parlay caching** — Running the same parlay again costs another analysis quota.

### Nice-to-have
6. **No Kelly sizing for parlays** — EV is shown but no optimal bet size recommendation.
7. **No parlay templates** — Can't save and recall common parlay structures.
8. **Default odds (-110) not validated** — Easy to accidentally submit with wrong odds.

## Strengths
- **Parlay math is correct** — American-to-decimal conversion, combined odds, implied probability all accurate
- **AI correlation warnings work** — Same-game legs flagged, Claude provides contextual analysis
- **Clean form UX** — Add/remove legs, 2-10 leg range, sport-per-leg selection
- **EV estimate helpful** — Shows if parlay is +EV with cents-per-dollar metric
- **Good error messages** — Validation clear on missing fields

## Verdict
**Would this bettor pay for Pro?** Probably not yet. The parlay builder is useful for one-off analysis but the manual workflow kills repeat usage. A parlay bettor places 2-3 parlays per week — manually entering 4-6 legs each time (typing descriptions, looking up odds) is too much friction. They'd use the +EV scanner and game analysis but skip the parlay builder after the novelty wears off.

**Key improvement**: "Add to Parlay" button on game cards would be the single highest-impact change. It turns a standalone analysis tool into an integrated workflow.
