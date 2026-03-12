Morning routine for BetBrain development:

1. **Health Check** — Run the full health check:
   - `npm run build`
   - `npm run lint`
   - Check for hardcoded keys
   - Check .gitignore

2. **Read Context** — Load:
   - CLAUDE.md
   - .claude/agent-comms/backlog.md
   - .claude/agent-comms/checkpoint.md (if exists)
   - docs/dev-knowledge/bug-patterns.md
   - Recent git log

3. **Assess State** — Determine:
   - What was completed yesterday
   - What's the highest-priority work in the backlog
   - Any blockers or dependencies
   - Which hierarchy level to work at

4. **Generate Task List** — Pick 3-5 tasks for this session:
   - Prioritize by the work hierarchy (features > bugs > tests > content > optimization)
   - Include at least one knowledge deposit
   - Include refactoring rotation item

5. **Start Executing** — Begin working through the task list, starting with the highest priority item.

Output the morning briefing, then start building.
