Save a checkpoint of the current development session state.

Gather and write to `.claude/agent-comms/checkpoint.md`:

1. **Session State:**
   - Current date/time
   - Current git branch and last commit hash
   - Files modified since last commit (`git status`)

2. **Work In Progress:**
   - What task was being worked on
   - Which backlog item(s) are in progress
   - Any partially completed work

3. **Context:**
   - Recent decisions made and why
   - Known issues or blockers
   - What should be done next

4. **Cycle Info:**
   - Current cycle number (from loop-log.md if available)
   - Hierarchy level being worked at
   - Refactoring rotation position

5. **Knowledge Captured This Session:**
   - Bugs found/fixed
   - Architecture decisions made
   - Schema changes

Format clearly so a fresh session can read this file and resume seamlessly.
