Generate a project summary for BetBrain:

1. **Git Activity** — Run `git log --oneline -20` and categorize recent commits:
   - Features built
   - Bugs fixed
   - Tests added
   - Refactoring/cleanup
   - Infrastructure/config changes

2. **Build Status** — Run `npm run build` and report pass/fail.

3. **Lint Status** — Run `npm run lint` and report pass/fail with issue count.

4. **Backlog Status** — Read `.claude/agent-comms/backlog.md`:
   - Count total items per section (Features, Bugs, Tests, Content, Optimization)
   - Count completed `[x]` vs pending `[ ]`
   - Calculate completion percentage

5. **Code Stats** — Count:
   - Total TypeScript/TSX files
   - Total lines of code (approximate)
   - Number of API routes in src/app/api/
   - Number of components in src/components/

6. **Knowledge Base** — Check docs/dev-knowledge/ for:
   - Number of bug patterns logged
   - Number of architecture decisions
   - Number of schema changes logged

7. **Agent/Skill Health** — Verify all agents and skills have valid frontmatter.

Output a formatted summary report. Save to `docs/daily-logs/summary-[date].md`.
