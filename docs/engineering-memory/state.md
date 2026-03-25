# Engineering State
## Current Session (2026-03-25, Session 13)
- Build status: GREEN (3061 tests, all passing, clean build)
- Blockers: (none)
- Test count: 3061 (161 test files)
- In progress: (none)
- Next up: Pick from remaining ideas list

## Key changes this session
- Morning brief: AI-powered daily summary with top plays, caution alerts, sport takes, checklist (25 tests)
- Morning brief UI: MorningBriefCard component + /api/brief route + dashboard integration
- B2B fatigue model: 5-factor scoring for NBA/NHL with ATS impact estimation (17 tests)
- Fatigue panel: FatiguePanel UI component + game detail "Fatigue" tab (NBA/NHL only)
- Line velocity alerts: configurable threshold rules with cooldown, sport multipliers (24 tests)
- Velocity alerts UI: rule management, dismissible alert cards, Signals page "Velocity Alerts" tab
- Portfolio risk fix: added probability-weighted exposure factor for underdog-heavy portfolios
- EV decay fix: added sport field + aggregateBySort() for cross-sport comparison
- API cost tracker: cost-per-insight metrics, sport efficiency, optimization recommendations (18 tests)
- Total: 5 new features, 2 fixes, 93 new tests (2968 -> 3061)
