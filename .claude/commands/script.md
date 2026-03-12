Generate a demo/pitch script for BetBrain based on current product state.

1. **Scan Current Features** — Read the codebase to determine what's actually built:
   - Which pages exist in src/app/
   - Which API routes exist in src/app/api/
   - Which components are built in src/components/
   - What data integrations are working

2. **Check Backlog** — Read .claude/agent-comms/backlog.md to understand what's planned vs built.

3. **Generate Script** — Write a demo script that:
   - Opens with the problem (bettors need data-driven insights, not gut feelings)
   - Shows what BetBrain does (only features that are ACTUALLY built)
   - Highlights the AI analysis (if built)
   - Shows the odds comparison (if built)
   - Mentions upcoming features (from backlog) as "coming soon"
   - Closes with pricing and CTA

4. **Save** to `docs/content/demo-script-[date].md`

The script should be conversational, 3-5 minutes when read aloud, and focus on value to the user.
