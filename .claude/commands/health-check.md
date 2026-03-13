Run a health check on BetBrain:

1. Run `npm run health-check`
2. Read `docs/dev-knowledge/health-check-latest.md`
3. Report:
   - build, lint, typecheck
   - dangerous imports in route files / proxy
   - API route error handling coverage
   - bare except count
   - widget sync status
   - hardcoded secret scan
   - env coverage / drift
   - AI disclaimer enforcement
   - migration drift / follow-up

If the build is sandbox-blocked, say so explicitly and rerun outside the sandbox if the task requires a real build verdict.
