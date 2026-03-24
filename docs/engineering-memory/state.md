# Engineering State
## Current Session (2026-03-24)
- Built: Stripe tier bypass, parlay stats UI, unit sizing card, Today's Action widget, landing page de-SaaS
- In progress: (none)
- Next up: More test coverage, additional dashboard improvements
- Build status: GREEN (1681 tests, all passing, clean build)
- Blockers: (none)
- Test count: 1681 (89 test files)

## Key changes this session
- Bypassed all Stripe/subscription tier gating (personal tool)
- Replaced landing page pricing with single "Personal" plan
- Updated FAQ to remove subscription references
- Added ParlayStatsDisplay component (shows straight vs parlay breakdown)
- Added UnitSizingCard component (Kelly-based sizing on game detail page)
- Added TodaysAction dashboard widget (pending picks with countdowns)
- Added 15 unit sizing integration tests
- Replaced Google Fonts with local geist package (build fix)
