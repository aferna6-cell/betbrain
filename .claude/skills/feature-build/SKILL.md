---
name: feature-build
description: "Use when building any new feature. Ensures proper patterns, typing, and testing."
---

# Feature Build Workflow

1. Check if similar feature exists
2. Run schema-guard if touching database
3. Create TypeScript types/interfaces first
4. Build API route in src/app/api/
5. Build UI component/page in src/app/ or src/components/
6. Add loading and error states
7. Add to navigation if it's a new page
8. Verify build passes
9. Update CLAUDE.md if new endpoint or table added
