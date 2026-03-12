---
name: ai-analysis
description: "Use when building or debugging AI-powered analysis features. Covers prompt design, structured output, confidence scoring, and disclaimer requirements."
---

# AI Analysis Patterns

## Analysis Structure
Every analysis must return this JSON structure:
```json
{
  "gameId": "string",
  "summary": "2-3 sentence overview",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "valueAssessment": {
    "side": "home|away|over|under",
    "confidence": "low|medium|high",
    "reasoning": "string"
  },
  "riskLevel": "low|medium|high",
  "smartSignal": true|false,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "dataFreshness": "timestamp"
}
```

## Prompt Design
- Include specific stats (not vague claims)
- Reference recent form (last 5-10 games)
- Consider injuries and their quantified impact
- Compare current line to the model's fair line
- Flag when line has moved significantly (sharp action)

## Disclaimer
MANDATORY on every analysis output. Non-negotiable.
