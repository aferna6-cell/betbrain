---
name: schema-guard
description: "Use BEFORE any database work. Verifies TypeScript interfaces match Supabase schema. Prevents type mismatches."
---

# Schema Guard

## Workflow
1. Check migration files or Supabase schema for actual column names
2. Compare against TypeScript interfaces in src/lib/supabase/
3. Flag any mismatch
4. Verify all Supabase queries use correct column names

## Common Mistakes
- Using camelCase in queries when Supabase columns are snake_case
- Missing columns that were never migrated
- Stale TypeScript types after schema changes
