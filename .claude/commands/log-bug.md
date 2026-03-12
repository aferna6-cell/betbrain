Log a bug to the knowledge base.

Ask for (or extract from context):
1. **Symptom** — What was observed? What went wrong?
2. **Root Cause** — Why did it happen?
3. **Fix** — What was changed to resolve it?
4. **Files Changed** — Which files were modified?
5. **Prevention** — How to avoid this in the future?

Format and append to `docs/dev-knowledge/bug-patterns.md`:

```
### [Short description]
**Date:** [today's date]
**Symptom:** [what happened]
**Root Cause:** [why]
**Fix:** [what was changed]
**Files:** [list]
**Prevention:** [how to avoid next time]
```

If a similar bug pattern already exists in the file, note that this is a recurrence and consider whether a skill or hook should be created to prevent it automatically.
