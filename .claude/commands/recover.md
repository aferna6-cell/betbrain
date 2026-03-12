Recover context from a previous session.

Read these files in order to rebuild context:

1. **`.claude/agent-comms/checkpoint.md`** — Last saved session state
2. **`.claude/agent-comms/loop-log.md`** — History of completed cycles
3. **`.claude/agent-comms/backlog.md`** — Current work queue
4. **`CLAUDE.md`** — Project overview and conventions
5. **`docs/dev-knowledge/bug-patterns.md`** — Known issues
6. **`docs/dev-knowledge/architecture-decisions.md`** — Design decisions
7. **`docs/dev-knowledge/schema-log.md`** — Database state

Then run:
- `git log --oneline -10` — Recent commits
- `git status` — Current working state
- `git diff --stat` — Any uncommitted changes

Synthesize a recovery report:
- Where we left off
- What needs to happen next
- Any blockers or issues
- Recommended next action

Then resume the development loop from the appropriate step.
