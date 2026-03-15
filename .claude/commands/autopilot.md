Autonomous development loop for BetBrain. Run continuously, picking up the next highest-priority work from the backlog each cycle.

## Loop Structure

Repeat forever:

### 1. Orient (read state)
- Read `.claude/agent-comms/backlog.md` for the current task list
- Read `docs/daily-logs/current-tasks.md` for recent context
- Run `git log --oneline -5` to see what was just done
- Read `docs/dev-knowledge/bug-patterns.md` for known pitfalls

### 2. Pick the next task
Use this priority hierarchy — always pick the highest unchecked item:
1. **Bugs** — fix any logged bugs first
2. **Features** — Growth features, then Premium features
3. **Tests** — write missing test suites
4. **Content** — explainer pages, legal, emails
5. **Optimization** — ISR, lazy loading, edge runtime, OG images
6. **Refactoring** — code quality improvements not in the backlog

If everything is done, look for improvements: new features to propose, code to clean up, performance to optimize, or new skills/agents/commands to create.

### 3. Build it
- Use the appropriate agent(s) in parallel when possible:
  - `frontend-dev` for UI work
  - `data-engineer` for API/data work
  - `ai-analyst` for Claude-powered features
  - `qa-tester` after changes to validate
- For small changes, do the work directly without agents
- Always read files before editing them
- Follow existing patterns in the codebase

### 4. Validate
- Run `npm run build` — must pass
- Run `npm run typecheck` — must pass
- Run `npx vitest run` — all tests must pass
- If anything fails, fix it before moving on

### 5. Record
- Mark the completed item as `[x]` in `backlog.md` with a cycle number
- Update `docs/dev-knowledge/architecture-decisions.md` if a non-obvious decision was made
- Update `docs/dev-knowledge/schema-log.md` if the database schema changed
- Log any new bug patterns to `docs/dev-knowledge/bug-patterns.md`
- Create or update skills, agents, or commands if a reusable pattern emerged

### 6. Commit
- Stage the changed files (specific files, not `git add -A`)
- Write a concise commit message describing what was built
- Do NOT push unless explicitly asked

### 7. Next cycle
- Print a one-line status: `[Cycle N] ✓ <what was done> | Next: <next task>`
- Continue to step 1

## Rules
- Never skip validation. If the build breaks, fix it in the same cycle.
- Never burn Odds API calls — all sports data work must use mocks or cached data.
- Every AI feature must include the disclaimer.
- Prefer small, shippable increments over large changes.
- If stuck on something for more than 2 attempts, log it as a bug and move on.
- Create new skills/agents/commands whenever a reusable workflow pattern emerges.
