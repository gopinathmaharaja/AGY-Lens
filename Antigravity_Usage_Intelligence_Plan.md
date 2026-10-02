# Antigravity Usage Intelligence — VS Code Extension

## 0. Project Goal

Build a local-first VS Code extension that analyzes Gemini Antigravity usage and helps the developer understand:

- Current model being used
- Context/token usage
- Remaining quota and reset time
- Daily/weekly/monthly usage
- Model usage distribution
- Prompt quality
- Prompt improvement opportunities
- Model recommendations for different tasks
- Conversation efficiency
- Repeated/inefficient prompts
- Personal prompting patterns
- Quota usage trends and forecasts
- Personalized AI productivity insights

### Product vision

> **Your personal AI usage analyst and prompting coach for Gemini Antigravity.**

The extension should start as a reliable usage dashboard and gradually become an AI usage coach.

---

# 1. Product Principles

Follow these principles throughout development.

## 1.1 Local-first

Default behavior:

- Store analytics locally.
- Do not upload prompts or source code.
- Do not require a backend.
- Make external AI analysis opt-in.
- Provide data export/import.

## 1.2 Reliable data over UI scraping

Do not start by scraping the Antigravity UI.

Prefer documented Antigravity CLI/status/transcript information where available.

The collector should be isolated so that Antigravity changes can be handled without rewriting the analytics layer.

## 1.3 Separate measured data from estimates

Clearly distinguish:

- Actual usage
- Antigravity-reported quota
- Calculated statistics
- Predictions/forecasts
- Heuristic recommendations

Never present an estimate as an actual Antigravity quota value.

## 1.4 Privacy and security

Prompt content may contain:

- Source code
- API keys
- Tokens
- Passwords
- Internal company information

Therefore:

- Redact secrets before external processing.
- Make prompt storage configurable.
- Keep external AI analysis disabled by default.
- Never log sensitive prompt content unnecessarily.

---

# 2. Recommended Technology Stack

## Extension

- TypeScript
- VS Code Extension API

## Dashboard

- React
- Vite
- VS Code Webview

## Database

- SQLite
- Drizzle ORM

## Validation

- Zod

## Charts

- Recharts

## Testing

- Vitest
- VS Code Extension Test Runner
- Playwright where useful

## Build

- esbuild or Vite
- vsce

## Optional AI providers

Later:

- Gemini API
- OpenAI API
- Claude API
- Ollama/local models

AI providers should not be required for the core product.

---

# 3. High-Level Architecture

```text
                         Gemini Antigravity
                                |
             +------------------+------------------+
             |                                     |
        Status/Usage                         Transcripts
             |                                     |
             +------------------+------------------+
                                |
                                v
                     Antigravity Collector
                                |
                                v
                          Data Parsers
                                |
                                v
                         Local SQLite DB
                                |
             +------------------+------------------+
             |                  |                  |
             v                  v                  v
       Usage Analyzer     Prompt Analyzer    Model Analyzer
             |                  |                  |
             +------------------+------------------+
                                |
                                v
                     Recommendation Engine
                                |
             +------------------+------------------+
             |                  |                  |
             v                  v                  v
         Status Bar         Dashboard        Prompt Coach
```

---

# 4. Project Structure

Create the project with this target structure:

```text
antigravity-usage-intelligence/
│
├── src/
│   ├── extension.ts
│   │
│   ├── collectors/
│   │   ├── antigravityCollector.ts
│   │   ├── transcriptCollector.ts
│   │   └── quotaCollector.ts
│   │
│   ├── parsers/
│   │   ├── statusParser.ts
│   │   ├── transcriptParser.ts
│   │   └── modelParser.ts
│   │
│   ├── analytics/
│   │   ├── usageAnalyzer.ts
│   │   ├── promptAnalyzer.ts
│   │   ├── modelAnalyzer.ts
│   │   ├── conversationAnalyzer.ts
│   │   └── quotaPredictor.ts
│   │
│   ├── recommendations/
│   │   ├── modelRecommendation.ts
│   │   ├── promptRecommendation.ts
│   │   └── conversationRecommendation.ts
│   │
│   ├── database/
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   └── repositories/
│   │       ├── usageRepository.ts
│   │       ├── promptRepository.ts
│   │       ├── sessionRepository.ts
│   │       └── quotaRepository.ts
│   │
│   ├── commands/
│   │   ├── openDashboard.ts
│   │   ├── analyzePrompt.ts
│   │   ├── improvePrompt.ts
│   │   └── exportData.ts
│   │
│   ├── services/
│   │   ├── secretRedactor.ts
│   │   ├── settingsService.ts
│   │   └── syncService.ts
│   │
│   └── webview/
│       ├── dashboard/
│       ├── usage/
│       ├── prompts/
│       ├── models/
│       └── insights/
│
├── webview/
│   └── React application
│
├── test/
│   ├── collectors/
│   ├── parsers/
│   ├── analytics/
│   └── recommendations/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── CHANGELOG.md
```

---

# 5. Phase 1 — Project Setup

## Goal

Create a working VS Code extension.

### Tasks

- [ ] Create Git repository.
- [ ] Initialize TypeScript project.
- [ ] Install VS Code extension dependencies.
- [ ] Configure TypeScript.
- [ ] Configure ESLint.
- [ ] Configure Prettier.
- [ ] Configure Vitest.
- [ ] Add VS Code extension manifest.
- [ ] Add extension activation event.
- [ ] Add first command.
- [ ] Add basic README.
- [ ] Add GitHub repository.
- [ ] Add CI workflow.

### First command

Create:

```text
Antigravity Usage: Open Dashboard
```

### Acceptance criteria

- Extension compiles.
- Extension can run in VS Code Extension Development Host.
- Command palette shows the command.
- Command opens a basic panel.

---

# 6. Phase 2 — Status Bar

## Goal

Create a useful status bar before building the dashboard.

Example:

```text
🚀 AG 78% | 03h 42m
```

Clicking it should open the dashboard.

### Tasks

- [ ] Create status bar item.
- [ ] Display current Antigravity model.
- [ ] Display quota percentage when available.
- [ ] Display reset countdown.
- [ ] Handle unavailable data.
- [ ] Add tooltip.
- [ ] Add refresh command.

### Example tooltip

```text
Antigravity Usage

Model: Gemini
Quota: 78%
Reset: 3h 42m
Context: 62%
```

### Acceptance criteria

- Status bar works without crashing when Antigravity is unavailable.
- Missing values show `N/A`.
- Refresh updates the displayed values.

---

# 7. Phase 3 — Antigravity Collector

## Goal

Build the data collection layer.

Do not mix collection logic with analytics.

Create an interface such as:

```ts
interface AntigravityUsageSnapshot {
  timestamp: string;
  model?: string;
  conversationId?: string;
  transcriptPath?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  contextTokens?: number;
  contextWindow?: number;
  quotaRemaining?: number;
  quotaResetTime?: string;
  workspace?: string;
  planTier?: string;
  agentState?: string;
}
```

### Tasks

- [ ] Detect Antigravity availability.
- [ ] Locate supported CLI/configuration information.
- [ ] Read status information.
- [ ] Parse JSON/status output.
- [ ] Validate with Zod.
- [ ] Normalize values.
- [ ] Handle missing fields.
- [ ] Add logging.
- [ ] Add unit tests.

### Acceptance criteria

Given valid Antigravity status data:

```text
collector
    ↓
normalized object
    ↓
validated object
```

No UI-specific parsing should leak into the analytics layer.

---

# 8. Phase 4 — Transcript Collector

## Goal

Collect conversation-level information where supported.

### Data to capture

- Conversation ID
- Timestamp
- Workspace
- Model
- Prompt
- Response metadata
- Token information
- Transcript location
- Agent state

### Tasks

- [ ] Detect transcript files.
- [ ] Read transcript incrementally.
- [ ] Avoid processing the same data repeatedly.
- [ ] Track file offsets or hashes.
- [ ] Parse conversation messages.
- [ ] Identify user prompts.
- [ ] Identify assistant responses.
- [ ] Extract usage metadata.
- [ ] Add tests using fixture transcripts.

### Important

Do not assume transcript formats are permanently stable.

Keep transcript parsing behind:

```text
TranscriptCollector
        ↓
TranscriptParser
        ↓
NormalizedConversation
```

---

# 9. Phase 5 — SQLite Database

## Goal

Persist analytics locally.

Recommended tables:

## sessions

```text
id
conversation_id
workspace
model
started_at
ended_at
agent_state
```

## prompts

```text
id
session_id
prompt
timestamp
category
prompt_score
```

## usage

```text
id
session_id
timestamp
input_tokens
output_tokens
cache_read_tokens
context_tokens
context_window
```

## quota

```text
id
model
remaining
reset_time
timestamp
```

## recommendations

```text
id
prompt_id
recommended_model
reason
confidence
created_at
```

## insights

```text
id
type
title
description
severity
created_at
```

### Tasks

- [ ] Create SQLite database.
- [ ] Create schema.
- [ ] Add migrations.
- [ ] Create repositories.
- [ ] Add indexes.
- [ ] Add retention settings.
- [ ] Add database health check.
- [ ] Add tests.

### Important indexes

```text
sessions(conversation_id)
sessions(started_at)
prompts(timestamp)
prompts(category)
usage(timestamp)
quota(timestamp)
```

---

# 10. Phase 6 — Usage Dashboard

## Goal

Create the first complete user-facing dashboard.

Dashboard sections:

```text
Overview
Usage
Models
Prompts
Conversations
Insights
Settings
```

## Overview

Display:

```text
Today's Requests
Today's Tokens
Current Quota
Quota Reset
Current Model
Average Prompt Score
Context Usage
```

## Usage page

Show:

- Today
- Yesterday
- Last 7 days
- Last 30 days

Metrics:

- Request count
- Input tokens
- Output tokens
- Context tokens
- Average tokens/request
- Average context usage

## Models page

Show:

```text
Model                  Requests     Usage %
------------------------------------------------
Gemini X                31           62%
Gemini Flash            14           28%
Claude X                 5           10%
```

Do not hard-code model names.

Read them dynamically.

---

# 11. Phase 7 — Charts

Add charts only after the underlying data is reliable.

## Charts

### Daily usage

```text
Date → tokens
```

### Requests

```text
Date → request count
```

### Model usage

```text
Model → request count
```

### Context usage

```text
Date → average context %
```

### Prompt score

```text
Date → average prompt score
```

### Quota

```text
Time → quota remaining
```

### Acceptance criteria

- Charts work with empty data.
- Charts work with one data point.
- Large values are formatted.
- Tooltips show exact values.
- Date range can be changed.

---

# 12. Phase 8 — Prompt Collection

## Goal

Capture prompts and analyze their quality.

Store prompt text only if the user enables prompt storage.

Settings:

```text
Store prompts:
[ON]

Store source code:
[OFF]

External AI analysis:
[OFF]
```

### Tasks

- [ ] Detect user prompt.
- [ ] Store prompt metadata.
- [ ] Classify prompt.
- [ ] Calculate basic prompt score.
- [ ] Detect missing information.
- [ ] Detect repeated prompts.
- [ ] Detect vague prompts.

---

# 13. Phase 9 — Prompt Quality Engine

Create a 0–100 score.

Suggested dimensions:

```text
Clarity                20
Context                15
Requirements           15
Constraints            15
Expected output        15
Acceptance criteria    10
Scope                  10
```

The exact weights should be configurable later.

## Example

Input:

```text
Fix my MongoDB query.
```

Possible analysis:

```text
Score: 35/100

Missing:
- Expected behavior
- Current behavior
- Error
- Relevant schema
- Constraints
- Expected output
```

Do not pretend the score is scientifically objective.

Call it:

> Prompt Quality Heuristic

---

# 14. Phase 10 — Prompt Categories

Automatically classify prompts.

Categories:

```text
Development
Debugging
Architecture
Code Review
Testing
Refactoring
Database
DevOps
Documentation
Research
Learning
Planning
Other
```

### Tasks

- [ ] Build rule-based classifier.
- [ ] Store category.
- [ ] Show category distribution.
- [ ] Allow manual correction.
- [ ] Learn from user corrections later.

---

# 15. Phase 11 — Prompt Improvement

Add command:

```text
Antigravity Usage: Improve Prompt
```

Example input:

```text
Fix my API issue.
```

Suggested improvement:

```text
Investigate the API issue in the current Node.js service.

Requirements:
- Identify the root cause.
- Preserve the existing API contract.
- Make the smallest appropriate code change.
- Add or update relevant tests.

Expected output:
1. Root cause
2. Code changes
3. Tests
4. Explanation
```

Buttons:

```text
[Apply]
[Copy]
[Cancel]
```

### Important

The first implementation can be rule-based.

AI-powered rewriting should be added later as an optional feature.

---

# 16. Phase 12 — Model Recommendation Engine

## Goal

Recommend which available model may fit the task.

Do not make universal claims such as:

> Model X is always better.

Instead analyze:

- Task complexity
- Context size
- Codebase size
- Prompt category
- Required reasoning
- Historical success
- Historical token usage
- User's previous model performance

Example:

```text
Prompt:
Rename this variable in one file.

Recommendation:
Use a lightweight/fast model if available.

Reason:
- Small scope
- Low context requirement
- Simple transformation
```

Another:

```text
Prompt:
Analyze the architecture of the payment system and
propose a migration strategy.

Recommendation:
Use a higher-reasoning model.

Reason:
- Architecture
- Multiple components
- High reasoning requirement
- Large context
```

### Confidence

Display:

```text
Recommendation confidence: 82%
```

But only if the confidence is derived from a defined scoring system.

---

# 17. Phase 13 — Conversation Efficiency

Analyze conversations.

Detect:

- Repeated prompts
- Repeated corrections
- Long context
- Unnecessary context
- Multiple failed attempts
- Same requirement repeated
- Very long sessions
- Context approaching limit

Example:

```text
⚠️ Conversation efficiency warning

The same requirement appears to have been
clarified several times.

Suggested action:

Create a concise summary and start a new
conversation.
```

---

# 18. Phase 14 — Context Monitoring

Display:

```text
Context

742K / 1M

███████████████░░░░░

74%
```

Thresholds can be configurable.

Example:

```text
< 60%   Normal
60–80%  Monitor
80–90%  Warning
> 90%   Critical
```

These are UI thresholds, not claims about Antigravity behavior.

### Tasks

- [ ] Current context display.
- [ ] Historical context.
- [ ] Warning notification.
- [ ] Dashboard chart.
- [ ] Configurable thresholds.

---

# 19. Phase 15 — Quota Analytics

## Goal

Show actual quota information when available.

Display:

```text
Current quota:
78%

Reset:
03h 42m
```

Historical:

```text
Today's quota observations
```

Calculate:

- Usage rate
- Average consumption
- Peak usage periods
- Usage by model
- Usage by category

### Forecast

If enough historical data exists:

```text
Estimated usage until reset:
...

Forecast confidence:
Medium
```

Always label this as an estimate.

Do not infer unavailable quota rules.

---

# 20. Phase 16 — Personal AI Usage Profile

Build a profile based on the user's own historical usage.

Example:

```text
Your AI Usage Profile

Strengths
- Clear technical context
- Good code references
- Good constraints

Improvement areas
- Acceptance criteria
- Expected output
- Task decomposition
```

Other insights:

```text
You frequently ask for:
- Debugging
- MongoDB
- React Native
- Node.js

Your average prompt:
3,200 characters

Your average prompt score:
78/100
```

All insights must be based on collected data.

---

# 21. Phase 17 — Prompt Coach

Add an optional pre-send experience.

Example:

```text
Prompt:
Fix this MongoDB query.
```

Show:

```text
Prompt Quality: 38/100

Potential improvements:

1. Explain current behavior.
2. Explain expected behavior.
3. Include relevant schema.
4. Include constraints.
5. Specify desired output.
```

Then:

```text
[Improve Prompt]
[Send Anyway]
[Dismiss]
```

This should be configurable so it does not interrupt the developer's workflow.

---

# 22. Phase 18 — AI-Powered Analysis

Only after the local analytics system is stable.

Supported providers can include:

```text
Gemini
OpenAI
Claude
Ollama
```

Architecture:

```text
AIProvider
   |
   +── GeminiProvider
   +── OpenAIProvider
   +── ClaudeProvider
   +── OllamaProvider
```

Interface:

```ts
interface AIProvider {
  analyzePrompt(input: PromptAnalysisInput): Promise<PromptAnalysis>;
  improvePrompt(input: PromptImproveInput): Promise<string>;
  recommendModel(input: ModelRecommendationInput): Promise<ModelRecommendation>;
}
```

### Privacy

Before sending:

```text
Prompt
  ↓
Secret Redactor
  ↓
Privacy Filter
  ↓
AI Provider
```

---

# 23. Phase 19 — Secret Detection

Detect common secret patterns.

Examples:

```text
AWS_ACCESS_KEY
AWS_SECRET_KEY
API_KEY
JWT
Bearer token
password
private key
database URL
```

Replace:

```text
sk-xxxxxxxxxxxx
```

with:

```text
[REDACTED]
```

### Tasks

- [ ] Implement regex detection.
- [ ] Add configurable patterns.
- [ ] Add tests.
- [ ] Add redaction preview.
- [ ] Allow user-defined patterns.

---

# 24. Phase 20 — Weekly AI Usage Report

Generate a local report.

Example:

```text
AI WEEKLY REPORT

Sessions:
126

Prompts:
348

Tokens:
2.8M

Average prompt score:
78/100

Most used model:
Gemini X

Most common task:
Debugging

Average context:
61%

Potential improvement areas:
- Acceptance criteria
- Long conversations
- Repeated prompts
```

Insights must be based on actual collected data.

---

# 25. Phase 21 — Export / Import

Support:

```text
JSON
CSV
Markdown
```

Example:

```text
Antigravity Usage
├── usage.json
├── prompts.json
└── insights.json
```

Commands:

```text
Antigravity Usage: Export Data
Antigravity Usage: Import Data
```

### Security

- Do not export secrets by default.
- Allow prompt export separately.
- Show a warning before exporting prompts.

---

# 26. Phase 22 — Settings

Create:

```text
Antigravity Usage
```

Settings:

```text
General
├── Enable extension
├── Refresh interval
└── Retention period

Privacy
├── Store prompts
├── Store source code
├── External AI analysis
└── Secret redaction

Analytics
├── Prompt scoring
├── Model recommendations
├── Conversation analysis
└── Forecasting

UI
├── Status bar
├── Notifications
└── Dashboard startup

AI
├── Provider
├── API key
├── Model
└── Temperature
```

Never store API keys in plain text.

Use VS Code SecretStorage where appropriate.

---

# 27. Phase 23 — Notifications

Useful notifications only.

Examples:

```text
⚠️ Context usage is above 85%.
```

```text
⚠️ Your quota reset is approaching.
```

```text
💡 This prompt is missing acceptance criteria.
```

```text
📊 Weekly AI usage report is ready.
```

Make notifications configurable.

Avoid notification spam.

---

# 28. Phase 24 — Testing Strategy

## Unit tests

Test:

- Parsers
- Collectors
- Database repositories
- Prompt scoring
- Prompt classification
- Secret redaction
- Model recommendation
- Quota calculations
- Forecasting

## Integration tests

Test:

```text
Antigravity data
    ↓
Collector
    ↓
Parser
    ↓
Database
    ↓
Analytics
    ↓
Dashboard
```

## UI tests

Test:

- Dashboard opens.
- Empty state.
- Usage charts.
- Prompt analyzer.
- Settings.
- Export/import.

## Regression fixtures

Keep sample Antigravity status/transcript data.

Whenever the format changes, add a fixture and regression test.

---

# 29. Phase 25 — Performance

The extension must not slow down VS Code.

Requirements:

- Do not scan transcripts continuously.
- Process incrementally.
- Use file hashes/offsets.
- Batch database writes.
- Debounce updates.
- Avoid expensive analytics on every event.
- Move heavy work off the UI thread where appropriate.

Target:

```text
Status update:
< 100 ms

Dashboard initial load:
< 500 ms

Typical prompt analysis:
< 200 ms for local rules
```

These are engineering targets, not guarantees.

---

# 30. Phase 26 — Error Handling

Handle:

```text
Antigravity not installed
Antigravity not running
CLI unavailable
Permission denied
Transcript unavailable
Invalid transcript
Database unavailable
Corrupted database
Unsupported version
Missing quota data
```

Never crash the extension because Antigravity is unavailable.

Example:

```text
Antigravity Usage

Status:
Not detected

The extension will continue monitoring
and retry automatically.
```

---

# 31. Phase 27 — Logging

Create extension logging levels:

```text
ERROR
WARN
INFO
DEBUG
```

Never log:

- Full prompts by default
- API keys
- Passwords
- Tokens
- Secrets

Provide:

```text
Antigravity Usage: Open Logs
```

---

# 32. Phase 28 — Command Palette

Commands:

```text
Antigravity Usage: Open Dashboard
Antigravity Usage: Refresh
Antigravity Usage: Analyze Prompt
Antigravity Usage: Improve Prompt
Antigravity Usage: Show Today's Usage
Antigravity Usage: Show Model Usage
Antigravity Usage: Export Data
Antigravity Usage: Import Data
Antigravity Usage: Open Settings
Antigravity Usage: Open Logs
Antigravity Usage: Reset Local Data
```

---

# 33. Phase 29 — MVP Definition

Do not publish until this MVP is complete.

## MVP must contain

- [ ] VS Code extension
- [ ] Antigravity detection
- [ ] Current model
- [ ] Context usage
- [ ] Quota information when available
- [ ] Reset time
- [ ] Local SQLite
- [ ] Daily usage
- [ ] Weekly usage
- [ ] Model usage
- [ ] Status bar
- [ ] Dashboard
- [ ] Basic charts
- [ ] Error handling
- [ ] Privacy settings
- [ ] Unit tests
- [ ] README

Do NOT require:

- AI prompt rewriting
- Cloud backend
- User accounts
- Remote database
- Complex recommendation engine

for MVP.

---

# 34. Version Roadmap

## v0.1 — Usage Tracker

```text
✓ Antigravity detection
✓ Status bar
✓ Model
✓ Context
✓ Quota
✓ Reset
✓ SQLite
```

## v0.2 — Analytics

```text
✓ Daily usage
✓ Weekly usage
✓ Model analytics
✓ Charts
✓ Conversation statistics
```

## v0.3 — Prompt Intelligence

```text
✓ Prompt collection
✓ Prompt scoring
✓ Prompt categories
✓ Prompt improvement
```

## v0.4 — AI Coach

```text
✓ Model recommendation
✓ Prompt coach
✓ Conversation efficiency
✓ Personal usage profile
```

## v0.5 — Advanced Analytics

```text
✓ Quota forecasting
✓ Weekly reports
✓ Advanced insights
✓ Export/import
```

## v1.0 — Production Release

```text
✓ Stable collector
✓ Stable database
✓ Privacy controls
✓ Full test coverage
✓ Documentation
✓ Marketplace-ready
```

---

# 35. Development Order

Follow this exact order.

```text
STEP 1
Create VS Code extension
        ↓
STEP 2
Create status bar
        ↓
STEP 3
Build Antigravity collector
        ↓
STEP 4
Normalize and validate data
        ↓
STEP 5
Create SQLite database
        ↓
STEP 6
Persist usage
        ↓
STEP 7
Build dashboard
        ↓
STEP 8
Add charts
        ↓
STEP 9
Add transcript collector
        ↓
STEP 10
Add prompt storage
        ↓
STEP 11
Build prompt quality engine
        ↓
STEP 12
Build prompt improvement
        ↓
STEP 13
Build model recommendation
        ↓
STEP 14
Build conversation analytics
        ↓
STEP 15
Build personal AI profile
        ↓
STEP 16
Add optional AI providers
        ↓
STEP 17
Add weekly reports
        ↓
STEP 18
Add export/import
        ↓
STEP 19
Security/privacy review
        ↓
STEP 20
Testing + performance
        ↓
STEP 21
Package extension
        ↓
STEP 22
Publish
```

---

# 36. First Sprint

Start with only these tasks.

## Sprint 1

### Task 1

Create repository:

```text
antigravity-usage-intelligence
```

### Task 2

Initialize:

```text
TypeScript
VS Code Extension API
ESLint
Prettier
Vitest
```

### Task 3

Create:

```text
src/extension.ts
```

### Task 4

Add command:

```text
Antigravity Usage: Open Dashboard
```

### Task 5

Add status bar:

```text
🚀 AG --%
```

### Task 6

Create:

```text
src/collectors/antigravityCollector.ts
```

### Task 7

Implement Antigravity detection.

### Task 8

Read available status/usage data.

### Task 9

Create:

```ts
AntigravityUsageSnapshot
```

### Task 10

Show:

```text
Model
Context
Quota
Reset
```

### Sprint 1 acceptance criteria

```text
VS Code
   ↓
Extension
   ↓
Antigravity collector
   ↓
Real usage/status data
   ↓
Status bar
```

If this works reliably, proceed to SQLite.

---

# 37. Sprint 2

Build:

```text
Collector
    ↓
Parser
    ↓
SQLite
    ↓
Usage repository
```

Complete:

- [ ] Database
- [ ] Schema
- [ ] Migrations
- [ ] Usage persistence
- [ ] Session persistence
- [ ] Quota persistence
- [ ] Unit tests

---

# 38. Sprint 3

Build dashboard:

```text
Overview
Usage
Models
```

Complete:

- [ ] Today
- [ ] Last 7 days
- [ ] Last 30 days
- [ ] Model usage
- [ ] Context usage
- [ ] Quota history
- [ ] Charts

---

# 39. Sprint 4

Build prompt intelligence:

```text
Prompt
 ↓
Classifier
 ↓
Quality Score
 ↓
Improvement Suggestions
```

Complete:

- [ ] Prompt storage
- [ ] Prompt categories
- [ ] Prompt score
- [ ] Missing-context detection
- [ ] Prompt improvement
- [ ] Prompt history

---

# 40. Sprint 5

Build recommendation engine:

```text
Prompt
   +
Context
   +
Task type
   +
Historical usage
        ↓
Model recommendation
```

Complete:

- [ ] Complexity score
- [ ] Context requirement
- [ ] Model capability metadata
- [ ] Historical model performance
- [ ] Recommendation
- [ ] Confidence
- [ ] Explanation

---

# 41. Sprint 6

Build AI coach:

```text
Personal usage
      ↓
Analytics
      ↓
Patterns
      ↓
Recommendations
```

Complete:

- [ ] Personal profile
- [ ] Conversation efficiency
- [ ] Repeated prompt detection
- [ ] Quota forecasting
- [ ] Weekly report
- [ ] AI-powered prompt improvement

---

# 42. Security Checklist

Before release:

- [ ] No secrets committed to Git.
- [ ] API keys use secure storage.
- [ ] Prompts are local by default.
- [ ] External AI disabled by default.
- [ ] Secret redaction enabled.
- [ ] Logs do not contain prompt content by default.
- [ ] Export warns about sensitive information.
- [ ] Database permissions checked.
- [ ] Dependencies audited.
- [ ] Extension permissions minimized.

---

# 43. Release Checklist

## Code

- [ ] TypeScript build passes.
- [ ] ESLint passes.
- [ ] Tests pass.
- [ ] No TypeScript errors.
- [ ] No known critical vulnerabilities.

## Extension

- [ ] Activation works.
- [ ] Status bar works.
- [ ] Dashboard works.
- [ ] Settings work.
- [ ] Commands work.
- [ ] Antigravity unavailable case works.

## Privacy

- [ ] Privacy policy prepared if needed.
- [ ] Data collection documented.
- [ ] External AI behavior documented.
- [ ] Secret handling documented.

## Documentation

- [ ] README
- [ ] Installation
- [ ] Configuration
- [ ] Privacy
- [ ] Troubleshooting
- [ ] FAQ
- [ ] Changelog

---

# 44. Success Metrics

After release, measure product usage without collecting private prompt content.

Useful metrics:

```text
Extension activations
Dashboard opens
Prompt analyzer usage
Prompt improvement usage
Export usage
Error rate
Collector success rate
```

For personal analytics, track:

```text
Average prompt score
Average context usage
Average tokens/request
Model distribution
Repeated prompt rate
Long conversation rate
Quota usage pattern
```

---

# 45. Future Features

Possible future versions:

## Project-level analytics

```text
Personal Finance App
    42 sessions
    1.4M tokens
    Avg prompt score 81
```

## Repository analytics

```text
Project
├── React Native
├── Node.js
├── MongoDB
└── Android
```

## AI productivity correlation

Compare:

```text
Prompt quality
       ↓
Iterations
       ↓
Tokens
       ↓
Successful completion
```

## Team analytics

Only if privacy and consent requirements are properly handled.

Potentially:

```text
Team AI usage
Model distribution
Prompt quality trends
```

Do not introduce team/cloud analytics until the local product is stable and privacy requirements are clear.

---

# 46. Final Architecture

The completed product should look like:

```text
┌─────────────────────────────────────────────┐
│       Antigravity Usage Intelligence        │
├─────────────────────────────────────────────┤
│                                             │
│  Usage       Prompts       Models           │
│     │           │             │             │
│     └───────────┼─────────────┘             │
│                 │                           │
│                 ▼                           │
│          Analytics Engine                   │
│                 │                           │
│      ┌──────────┼──────────┐                │
│      ▼          ▼          ▼                │
│   Insights   Coach    Recommendations       │
│      │          │          │                │
│      └──────────┼──────────┘                │
│                 ▼                           │
│          Better AI Workflow                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 47. Definition of Done

The project is considered complete for v1.0 when:

- [ ] Antigravity usage can be collected reliably.
- [ ] Current model is displayed.
- [ ] Context usage is displayed.
- [ ] Quota information is displayed when available.
- [ ] Reset time is displayed when available.
- [ ] Usage is persisted locally.
- [ ] Daily/weekly/monthly analytics work.
- [ ] Model usage is analyzed.
- [ ] Prompts can be analyzed.
- [ ] Prompt quality is scored using transparent heuristics.
- [ ] Improvement suggestions are available.
- [ ] Model recommendations explain their reasoning.
- [ ] Conversation inefficiencies can be detected.
- [ ] User-specific prompting patterns can be identified.
- [ ] Privacy controls are available.
- [ ] Secrets are redacted before external processing.
- [ ] Data can be exported/imported.
- [ ] Tests cover core functionality.
- [ ] Extension performs well.
- [ ] Documentation is complete.
- [ ] Extension can be packaged and installed.

---

# 48. Immediate Next Action

Do **not** build the complete application immediately.

Start with:

```text
STEP 1
Create the VS Code extension project.

STEP 2
Create the status bar.

STEP 3
Create AntigravityCollector.

STEP 4
Read the real Antigravity status/usage information.

STEP 5
Display:

Model
Context %
Quota %
Reset time

STEP 6
Only after these values are reliable,
start the SQLite layer.
```

This creates a solid foundation and prevents building analytics on top of guessed or unreliable Antigravity usage data.
