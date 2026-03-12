Run a health check on BetBrain:

1. Does `npm run build` pass?
2. Does `npm run lint` pass?
3. Any hardcoded API keys in source files? (grep for sk_, NEXT_PUBLIC_ values that aren't process.env references)
4. Any `any` types in TypeScript without justification?
5. Are all AI insights including the disclaimer?
6. Check for unused imports
7. Check that .env.local is in .gitignore
8. Check that all API routes have error handling

Output pass/fail for each check. Save to docs/dev-knowledge/health-check-latest.md.
