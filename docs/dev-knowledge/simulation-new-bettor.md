# Customer Simulation: New Bettor (First-Time User)
Date: 2026-03-17

## Persona
21-year-old casual sports fan who just became eligible to bet. Watches NBA and NFL regularly but has never placed a bet. Doesn't understand American odds format, spreads, EV, CLV, ROI, units, or any betting terminology. Looking for a tool to help them get started.

## Journey

1. **Landing page** — First impression is mixed. The hero ("Find edges the market hasn't corrected") uses jargon immediately. Feature list is aggressively technical (CLV, Kelly Criterion, EV). A new bettor would feel this product "isn't for me." However, the pricing is clear and "No credit card required" is welcoming.

2. **Signup** — Straightforward, no issues.

3. **Dashboard** — Shows "Analyses Today: 0/3" without explaining what an analysis is. The onboarding checklist appears but its steps assume knowledge ("Set a line movement alert" — what's line movement?).

4. **Game cards** — Critical failure point. Odds shown as "-110, +150" with zero explanation. Implied probability shown as "57.2%" in tiny text — no context. "15+ pt book spread — odds disagree" warning is yellow but meaningless to a beginner. Best odds highlighted green but no legend explains why.

5. **Game detail** — Odds table shows multiple bookmakers but the user doesn't know what a bookmaker is, why prices differ, or what "spread" and "total" mean in the tabs.

6. **Pick tracker** — Bare description. No tutorial, no example pick, no explanation of what's being tracked.

7. **Glossary** — Actually well-written and covers key terms. But it's buried in the nav — a confused new user won't know to look here. No inline links from confusing UI elements to glossary.

8. **Smart Signals** — "Games where odds, AI analysis, and market data align" — too vague for a beginner. No explanation of signal accuracy or what to do with one.

9. **Tools (odds converter)** — Functional but doesn't explain when/why you'd convert between formats.

## Gaps Found
- **No inline help/tooltips on game cards** → Added to backlog: wire TermTooltip to odds, implied prob, book spread on game cards
- **Landing page jargon barrier** → Added to backlog: add "New to betting?" section with beginner links
- **Onboarding checklist assumes knowledge** → Added to backlog: rewrite checklist descriptions with beginner-friendly explanations
- **No "What is this?" on dashboard analysis counter** → Added to backlog: add tooltip explaining analyses
- **Game card green highlighting unexplained** → Added to backlog: add subtle legend "Green = best price"
- **No foundational "Betting 101" content** → Added to backlog: create beginner guide page

## Strengths
- Glossary definitions are clear and well-written
- Odds converter tool is functional and shows practical payout
- "No real money" disclaimer on pick tracker is good
- Dark theme is clean and professional
- The TermTooltip component already exists — it just needs to be wired to more places
- Responsible gambling disclaimer is present

## Verdict
A brand new bettor would **not** pay for BetBrain today. The product assumes intermediate betting knowledge throughout. The glossary is good but buried. The biggest quick win is wiring the existing TermTooltip component to jargon-heavy areas (game cards, dashboard, signals). A "Betting 101" page would also help significantly. The core product is excellent for someone who already understands betting — the gap is purely educational, not functional.
