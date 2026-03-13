Interactive evening routine for BetBrain:

1. **Check for prior automated run**
   - Look for `docs/daily-logs/auto-evening-[date].log`
   - If it exists, read it first and supplement gaps instead of duplicating work
   - If it does not exist, run the full evening review

2. **Review the day**
   - Start with `git log --since=today --oneline`
   - If that is empty because the day boundary already rolled over, rerun with an explicit date window
   - Capture changed files, work themes, fix-like commits, migrations, and operational lessons

3. **Refresh the health snapshot**
   - Run `npm run health-check`
   - Compare against any morning or prior evening snapshot if available
   - Call out sandbox-only build failures separately from real app failures

4. **Improve the system**
   - Prefer small, durable fixes: scripts, guardrails, prompts, docs, helpers, validation
   - Update knowledge files when new bugs, schema changes, or workflow lessons appear
   - Create or update `docs/daily-logs/current-tasks.md` and `docs/daily-logs/[date].md`

5. **Close with setup clarity**
   - Explicitly list manual setup, env vars, third-party dependencies, and scheduler / CI implications
   - Record tomorrow’s top 3 priorities
