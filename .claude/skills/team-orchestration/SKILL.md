---
name: team-orchestration
description: "Use for complex tasks that need multiple agents. Defines delegation patterns."
---

# Team Orchestration

## Agents
| Agent | Role | Tools |
|-------|------|-------|
| data-engineer | Sports APIs, caching, pipelines | Read/Write |
| ai-analyst | Claude analysis, prompts, insights | Read/Write |
| frontend-dev | Next.js UI, components, charts | Read/Write |
| qa-tester | Validation, builds, edge cases | Read-only + Bash |

## Patterns

### New Feature (data + AI + UI):
1. data-engineer → build API integration + cache
2. ai-analyst → build analysis logic
3. frontend-dev → build UI
4. qa-tester → validate

### New Feature (data + UI only):
1. data-engineer → build API integration
2. frontend-dev → build UI
3. qa-tester → validate

### Bug Fix:
1. qa-tester → diagnose
2. [relevant agent] → fix
3. qa-tester → verify
