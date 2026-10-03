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

# 🔴 CRITICAL ISSUES AUDIT (Current State — October 2026)

Before proceeding with any new development, these core issues **MUST** be fixed. The extension currently shows **fabricated/random values** in several places, making it unreliable and useless.

## Issue 1: Quota Values Are Completely Fake

**Location:** [`quotaCollector.ts`](src/collectors/quotaCollector.ts)

**Problem:** When Antigravity doesn't report quota (which is always, since there is no quota API), the collector falls back to a hardcoded `remaining = 85` and a fake reset time of "now + 4 hours". These fake values flow through the entire system — status bar, dashboard, database, forecasts — and are never labeled clearly enough as fabricated.

**Impact:** Users see `85%` quota remaining, a countdown timer to a nonexistent reset, and forecast predictions derived from fake data. This is the #1 reason the extension feels like "random values".

**Fix:** Either discover real quota data or **remove quota display entirely** until real data is available. Never show fake numbers.

## Issue 2: Token Counts Are Rough Estimates, Not Real

**Location:** [`transcriptParser.ts`](src/parsers/transcriptParser.ts) line 57

**Problem:** Token estimation uses `Math.round(contentLength / 4)` — a crude heuristic of "4 chars per token". This is applied to the raw content string which includes system prompts, XML tags, tool calls, and metadata — all of which inflate the count enormously. The `transcript.jsonl` uses a compact format with `truncated_fields`, so much content is already omitted, leading to undercount. The full content is in `transcript_full.jsonl` which is never read.

**Impact:** Token counts displayed in the dashboard, weekly report, and charts are wildly inaccurate — sometimes off by 10x or more.

**Fix:** Use `transcript_full.jsonl` for actual content. Separate system/user/model content. Use proper tokenizer estimation or at minimum use content-type-aware sizing.

## Issue 3: History Only Reads Active CLI Conversation

**Location:** [`syncService.ts`](src/services/syncService.ts) line 64

**Problem:** `sync()` only reads the single most-recently-modified conversation from `~/.gemini/antigravity-cli/brain/`. It ignores:
- **57 conversations** in `~/.gemini/antigravity/brain/` (Antigravity Desktop App)
- **3 conversations** in `~/.gemini/antigravity-ide/brain/` (Antigravity IDE / VS Code extension usage)
- **13 conversations** in `~/.gemini/antigravity-cli/brain/` (CLI usage)
- The `history.jsonl` file with all 30 CLI prompts and timestamps

**Impact:** The extension shows only 1 conversation. The user's actual 73+ conversations across 3 platforms are invisible.

**Fix:** Scan all three brain directories. Parse all transcripts. Build a unified history view with source attribution (CLI / IDE / App).

## Issue 4: Weekly Report Shows Hardcoded Improvement Areas

**Location:** [`usageAnalyzer.ts`](src/analytics/usageAnalyzer.ts) lines 125-129

**Problem:** `generateWeeklyReport()` always returns the exact same three hardcoded improvement areas regardless of actual data:
```
'Add verifiable acceptance criteria before submitting complex prompts'
'Start fresh sessions when conversation history exceeds 20 turns'
'Use faster models for lightweight code edits and documentation'
```

**Impact:** The weekly report is not useful — it shows the same generic advice every single week.

**Fix:** Derive improvement suggestions from actual patterns in the user's prompt history, category distribution, and conversation efficiency.

## Issue 5: Prompt Count Comparison Is Broken

**Location:** [`syncService.ts`](src/services/syncService.ts) lines 98-100

**Problem:** `existingPromptCount = this.promptRepo.count()` counts ALL prompts across ALL sessions, then compares it to `parsed.userPrompts.length` which is per-conversation. This means after the first conversation is stored, no new prompts are ever stored for subsequent conversations.

**Fix:** Track prompts per conversation, not globally.

## Issue 6: Usage Records Are Duplicated Every Sync Cycle

**Location:** [`syncService.ts`](src/services/syncService.ts) lines 117-127

**Problem:** Every 30 seconds, the sync inserts a new usage record with the cumulative token totals. Over a 1-hour session, this creates 120 duplicate rows, all with the same cumulative totals. This makes `getDailyUsage()` return massively inflated counts.

**Fix:** Only insert usage delta (new tokens since last sync), or use upsert per session.

## Issue 7: `getAllConversationIds()` Misses IDE Directory

**Location:** [`antigravityCollector.ts`](src/collectors/antigravityCollector.ts) line 155

**Problem:** Only iterates over `cliDir` and `appDir`. The `ideDir` (`~/.gemini/antigravity-ide/brain/`) is never scanned.

**Fix:** Add `ideDir` to the scan loop.

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

**NEW RULE:** If real data is unavailable for a metric, display "Unavailable" or "No data" — **never** show a fake hardcoded number as if it's real.

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

- SQLite (node:sqlite DatabaseSync)

## Validation

- Zod

## Charts

- Recharts

## Testing

- Vitest
- VS Code Extension Test Runner

## Build

- esbuild (extension)
- Vite (webview)
- vsce (packaging)

---

# 3. Discovered Data Sources

Based on analysis of the actual filesystem at `C:\Users\gopin\.gemini\`:

## 3.1 Three Brain Directories (Conversation Transcripts)

| Source | Path | Conversations Found | Description |
|--------|------|:---:|-------------|
| **CLI** | `~/.gemini/antigravity-cli/brain/` | 13 | Antigravity CLI terminal sessions |
| **App** | `~/.gemini/antigravity/brain/` | 57 | Antigravity Desktop App sessions |
| **IDE** | `~/.gemini/antigravity-ide/brain/` | 3 | VS Code extension (Antigravity IDE) |

Each conversation directory contains:
```
{conversation-id}/
  .system_generated/
    logs/
      transcript.jsonl       ← Compact transcript (truncated fields)
      transcript_full.jsonl  ← Full transcript (no truncation)
```

## 3.2 Transcript JSONL Format

Each line is a JSON object:
```json
{
  "step_index": 0,
  "source": "USER_EXPLICIT",
  "type": "USER_INPUT",
  "status": "DONE",
  "created_at": "2026-10-03T05:56:17Z",
  "content": "...",
  "thinking": "...",
  "tool_calls": [...],
  "truncated_fields": ["content"],
  "media": [...]
}
```

**Key fields for analytics:**
- `source`: `USER_EXPLICIT` (user input), `MODEL` (AI response), `SYSTEM` (system messages)
- `type`: `USER_INPUT`, `PLANNER_RESPONSE`
- `content`: The actual text (may be truncated in `transcript.jsonl`)
- `tool_calls`: Array of tool invocations (file edits, commands, searches)
- `thinking`: Model's chain-of-thought reasoning
- `truncated_fields`: Which fields to read from `transcript_full.jsonl` instead

## 3.3 CLI History File

**Path:** `~/.gemini/antigravity-cli/history.jsonl`
**Lines:** 30 entries

Each line:
```json
{
  "display": "user's typed prompt text",
  "timestamp": 1790928221243,
  "workspace": "D:\\Projects\\...",
  "conversationId": "uuid",
  "type": "slash_command"  // optional, only for /commands
}
```

This is the **authoritative** list of CLI prompts with exact timestamps. Does NOT exist for IDE or App.

## 3.4 Settings File

**Path:** `~/.gemini/antigravity-cli/settings.json`

Contains:
- `model`: Currently selected model (e.g., `"Claude Opus 4.6 (Thinking)"`)
- `permissions.allow`: Allowed shell commands
- `trustedWorkspaces`: Workspace paths

## 3.5 Presence Directory

**Path:** `~/.gemini/antigravity-cli/presence/`

Contains `.lock` files for active conversations. File modification time indicates last activity.

## 3.6 Conversation Summaries Database

**Path:** `~/.gemini/antigravity-cli/conversation_summaries.db` (SQLite)
**Path:** `~/.gemini/antigravity/conversation_summaries.db` (SQLite)

Contains conversation metadata. Can be queried for titles and summaries.

## 3.7 What Is NOT Available

- ❌ **Quota remaining percentage** — Antigravity does not expose quota via any local file or API
- ❌ **Quota reset time** — No local source exists
- ❌ **Exact token counts** — Transcripts don't include token counts; estimation is required
- ❌ **Rate limit status** — Not exposed locally
- ❌ **Plan tier information** — Not in local files

---

# 4. Architecture

```text
        Antigravity CLI        Antigravity App        Antigravity IDE
              │                      │                       │
              ├── brain/             ├── brain/              ├── brain/
              │   └── transcripts    │   └── transcripts     │   └── transcripts
              ├── history.jsonl      │                       │
              ├── settings.json      │                       │
              └── presence/          │                       │
                                     │                       │
              ┌──────────────────────┴───────────────────────┘
              │
              ▼
    Unified Multi-Source Collector
              │
              ▼
    Transcript Parser (uses transcript_full.jsonl)
              │
              ▼
    Local SQLite Database
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
  Usage    Prompt     Session
 Analyzer  Analyzer   Tracker
    │         │          │
    └─────────┼──────────┘
              ▼
    Recommendation Engine
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
 Status    Dashboard  Weekly
  Bar                 Report
```

---

# 5. Database Schema (Updated)

## sessions

```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'cli',  -- NEW: 'cli', 'app', 'ide'
  workspace TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  agent_state TEXT NOT NULL DEFAULT 'IDLE',
  title TEXT NOT NULL DEFAULT '',
  step_count INTEGER NOT NULL DEFAULT 0,
  user_prompt_count INTEGER NOT NULL DEFAULT 0,  -- NEW
  total_estimated_input_tokens INTEGER DEFAULT 0,  -- NEW
  total_estimated_output_tokens INTEGER DEFAULT 0, -- NEW
  last_synced_step INTEGER DEFAULT 0  -- NEW: track incremental sync
);
```

## prompts

```sql
CREATE TABLE prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,  -- conversation_id
  source TEXT NOT NULL DEFAULT 'cli',  -- NEW: 'cli', 'app', 'ide'
  step_index INTEGER NOT NULL DEFAULT 0,  -- NEW: unique per conversation
  prompt TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  prompt_score REAL NOT NULL DEFAULT 0,
  clarity_score REAL DEFAULT 0,
  context_score REAL DEFAULT 0,
  requirements_score REAL DEFAULT 0,   -- NEW
  constraints_score REAL DEFAULT 0,    -- NEW
  expected_output_score REAL DEFAULT 0, -- NEW
  acceptance_criteria_score REAL DEFAULT 0, -- NEW
  scope_score REAL DEFAULT 0,          -- NEW
  missing_items TEXT DEFAULT '',
  estimated_input_tokens INTEGER DEFAULT 0, -- NEW: tokens for this prompt
  estimated_output_tokens INTEGER DEFAULT 0, -- NEW: tokens for response
  word_count INTEGER DEFAULT 0,  -- NEW
  UNIQUE(session_id, step_index)  -- prevent duplicates
);
```

## usage_snapshots (renamed from usage — no longer per-sync-cycle)

```sql
CREATE TABLE usage_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'cli',
  snapshot_at TEXT NOT NULL,
  cumulative_input_tokens INTEGER NOT NULL DEFAULT 0,
  cumulative_output_tokens INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  model TEXT DEFAULT '',
  UNIQUE(session_id)  -- one row per conversation, upserted
);
```

## quota (ONLY stores real observed values, never estimates)

```sql
CREATE TABLE quota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,
  remaining REAL,
  reset_time TEXT,
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'observed'  -- 'observed' only
);
```

---

# 🚀 IMPLEMENTATION PHASES

---

# Phase 1: Fix the Data Foundation (CRITICAL — Do First)

**Goal:** Make every displayed value real and accurate. Remove all fake/hardcoded data.

## Phase 1A: Fix Multi-Source Collection

### Tasks

- [x] Update `AntigravityCollector.getAllConversationIds()` to scan ALL THREE directories:
  - `~/.gemini/antigravity-cli/brain/`
  - `~/.gemini/antigravity/brain/`
  - `~/.gemini/antigravity-ide/brain/`
- [x] Return source attribution with each conversation: `{ id: string, source: 'cli' | 'app' | 'ide' }`.
- [x] Create `HistoryCollector` to parse `~/.gemini/antigravity-cli/history.jsonl`.
  - Extract: prompt text, timestamp, workspace, conversationId, type.
  - Correlate with transcript data for enriched prompt records.
- [x] Read `settings.json` for current model name instead of hardcoding.
- [x] Query `conversation_summaries.db` for conversation titles where available.

### Acceptance Criteria

- All 73+ conversations appear in the session list.
- Each session shows its source (CLI / App / IDE).
- `history.jsonl` prompts are available as a separate data feed.

## Phase 1B: Fix Transcript Parsing

### Tasks

- [x] Use `transcript_full.jsonl` (not `transcript.jsonl`) for content extraction.
  - Fall back to `transcript.jsonl` only if full version doesn't exist.
- [x] Improve token estimation:
  - Strip XML tags (`<USER_REQUEST>`, `<ADDITIONAL_METADATA>`, etc.) before counting.
  - Strip system prompts and instructions from user content before counting.
  - Use separate estimation for user input vs. model output vs. tool calls.
  - Minimum: `Math.round(cleanedContent.length / 3.8)` (closer to real tokenizer ratio).
- [x] Extract per-prompt token estimates:
  - For each `USER_INPUT` step, estimate input tokens.
  - For the following `PLANNER_RESPONSE` step(s), estimate output tokens.
  - Store both in the `prompts` table.
- [x] Parse `tool_calls` array to count and categorize tool usage per conversation.
- [x] Parse model from `USER_SETTINGS_CHANGE` entries AND from `settings.json`.

### Acceptance Criteria

- Token counts are within 2x of reality (instead of 10x).
- Each prompt record has its own estimated input and output token count.
- Model is detected from transcript or settings, never hardcoded.

## Phase 1C: Fix Quota Display — Remove Fake Values

### Tasks

- [x] Remove the hardcoded `remaining = 85` fallback from `QuotaCollector`.
- [x] Remove the fake `resetIso = now + 4 hours` fallback.
- [x] When quota data is unavailable (which is always for now):
  - Status bar shows: `$(hubot) AG: {Model}` (no quota percentage)
  - Dashboard shows: "Quota: Not available — Antigravity does not expose quota data locally"
  - Tooltip shows: "Quota: Unavailable"
- [x] Remove the `QuotaPredictor` forecast from the dashboard until real data exists.
- [x] Add a clear label if any estimate is ever shown: `⚠️ Estimated` with explanation.
- [x] Keep the quota table and infrastructure — it will be useful if/when Antigravity exposes quota data.

### Acceptance Criteria

- No fake numbers appear anywhere in the UI.
- Status bar shows model and state, not fabricated quota.
- Dashboard clearly communicates what data is and isn't available.

## Phase 1D: Fix Usage Record Duplication

### Tasks

- [x] Change `usage_snapshots` table to use `UNIQUE(session_id)` with upsert semantics.
- [x] On each sync, upsert the cumulative totals instead of inserting new rows.
- [x] Daily usage queries should calculate per-day deltas from session-level snapshots.
- [x] Fix prompt deduplication: track per-conversation using `(session_id, step_index)` unique constraint.

### Acceptance Criteria

- After running for 1 hour, the database has 1 usage snapshot per conversation (not 120).
- Daily token counts are accurate.
- No duplicate prompts exist in the database.

---

# Phase 2: Complete History Collection

**Goal:** Show every prompt from every source with correct per-prompt token estimates.

## Phase 2A: Full Historical Scan

### Tasks

- [x] On first extension activation (or "Reset & Rescan"), perform a full scan:
  - Iterate ALL conversations in all three brain directories.
  - Parse each transcript (using `transcript_full.jsonl`).
  - Insert all sessions and prompts into the database.
  - Track scan state to avoid re-processing on future startups.
- [x] Store scan checkpoints: `last_scanned_step` per conversation.
- [x] Implement incremental scan: on each periodic sync, only process new steps since last checkpoint.

### Phase 2B: Unified Prompt History View

### Tasks

- [x] Dashboard "Prompt Coach" tab shows ALL prompts from ALL sources.
- [x] Each prompt row shows:
  - Source icon: 📟 CLI, 🖥️ App, 💻 IDE
  - Prompt text (with click-to-expand)
  - Category
  - Score (0-100)
  - Estimated input tokens for this prompt
  - Estimated output tokens for the AI response
  - Total tokens consumed (input + output)
  - Timestamp
  - 7 transparent dimension scores upon expansion
- [x] Add column sorting and filtering by source, category, date range, score range.
- [x] Add search/filter for prompt text.

### Phase 2C: Per-Prompt Token Accounting

### Tasks

- [x] For each user prompt (step where source=USER_EXPLICIT and type=USER_INPUT):
  1. Extract cleaned prompt text (strip XML, metadata).
  2. Estimate input tokens from cleaned prompt.
  3. Find the subsequent PLANNER_RESPONSE step(s) until the next USER_INPUT.
  4. Sum the estimated output tokens from those response steps.
  5. Store both values in the `prompts` table.
- [x] Show per-prompt token breakdown in the Prompt History table.
- [x] Add a "Token Cost" column to help users identify expensive prompts.
- [x] Highlight expensive prompts (>30k tokens output) with a warning badge.

### Acceptance Criteria

- Every historical prompt from CLI, App, and IDE appears in the prompt table.
- Each prompt shows its individual token cost (input + output).
- Source attribution is visible and filterable.

---

# Phase 3: Fix Weekly Report

**Goal:** Generate a meaningful weekly report based on actual collected data.

## Phase 3A: Data-Driven Weekly Report

### Tasks

- [x] Query the database for the last 7 days of data:
  - Total sessions (count distinct conversation_id where started_at >= 7 days ago)
  - Total prompts submitted
  - Total estimated tokens consumed (input + output)
  - Average prompt quality score
  - Model usage distribution
  - Category distribution
  - Prompts per day trend
  - Top 5 most expensive prompts (by token count)
  - Top 3 lowest-scoring prompts (with suggestions)
  - Source breakdown: how many from CLI vs App vs IDE
- [x] Generate improvement suggestions FROM THE DATA:
  - If avg prompt score < 50: "Your prompts are frequently missing context and requirements. Try including file names and expected outputs."
  - If repeated prompts > 3: "You submitted {N} duplicate or near-duplicate prompts. Review conversation context before re-asking."
  - If avg prompt length < 20 chars: "Your prompts average only {N} characters. Adding more context typically improves AI response quality."
  - If any category dominates > 60%: "Most of your prompts are {category}. Consider trying AI for {other categories} too."
  - If conversations avg > 25 turns: "Your conversations average {N} turns. Starting fresh conversations after complex topics may improve results."
  - If most tokens go to top 3 prompts: "Your top 3 most expensive prompts consumed {X}% of total tokens. Review if those could be broken down."
- [x] Add week-over-week comparison when previous week's data exists.

### Phase 3B: Weekly Report Dashboard Tab

### Tasks

- [x] Replace hardcoded improvement areas with dynamically generated ones.
- [x] Add visual comparison cards:
  - Sessions this week vs last week (with ↑↓ arrows)
  - Tokens this week vs last week
  - Avg prompt score this week vs last week
- [x] Add "Top Expensive Prompts" section with prompt text, token count, and category.
- [x] Add "Lowest Quality Prompts" section with prompt text, score, and missing items.
- [x] Add source breakdown pie/bar chart: CLI vs App vs IDE usage.
- [x] Add daily trend sparkline for prompt count and token usage across the week.

### Acceptance Criteria

- Weekly report shows real numbers from the database.
- Improvement suggestions are specific to the user's actual patterns.
- Report changes from week to week as usage patterns change.
- No hardcoded text appears in the improvement areas.

---

# Phase 4: Fix Token Usage Display

**Goal:** Show accurate and useful token information throughout the UI.

## Phase 4A: Status Bar (Token-Aware)

### Tasks

- [x] Status bar format: `{icon} AG: {Model} | {TodayTokens}k`
  - Example: `$(hubot) AG: Claude Opus 4.6 | 124k`
- [x] Tooltip shows:
  - Model: Claude Opus 4.6 (Thinking)
  - State: IDLE
  - Today: 124,000 tokens (12 prompts)
  - This week: 890,000 tokens (67 prompts)
  - Active conversation: {id} ({N} turns)
  - Quota: Not available
- [x] Remove quota percentage from status bar since it's always fake.

### Phase 4B: Dashboard Overview Cards

### Tasks

- [x] "Today's Tokens" card: Show actual token count from today's prompts + responses.
- [x] "Today's Requests" card: Count of actual user prompts submitted today.
- [x] "Current Model" card: Read from settings.json, not from transcript (which may be stale).
- [x] "This Week" card: Total tokens and prompts for the current week.
- [x] Remove or clearly mark quota card as "Not Available".
- [x] Context window card: Keep this — context tokens are estimable from transcript.

### Phase 4C: Token Usage Charts (Accurate)

### Tasks

- [x] Daily token chart: Derive from per-prompt token estimates, not from duplicated usage records.
- [x] Input vs Output split chart: Show the ratio of user input tokens to AI output tokens.
- [x] Tokens by source chart: CLI vs App vs IDE token consumption.
- [x] Tokens by category: How much each task type (Debugging, Development, etc.) costs.
- [x] Add "Cost per prompt" trend line: average tokens per prompt over time.

### Acceptance Criteria

- All token values shown are derived from actual transcript data.
- Charts update as new data is collected.
- Zero fake/hardcoded token values.

---

# Phase 5: Improve Prompt Quality Engine

**Goal:** Make prompt scoring more accurate and show per-prompt improvement potential.

## Phase 5A: Store All Dimension Scores

### Tasks

- [x] Store all 7 dimension scores in the prompts table (schema already updated above).
- [x] Show dimension breakdown in prompt history table as expandable row detail.
- [x] Add a dimension radar chart on the Personal Profile tab.

## Phase 5B: Improve Where-to-Improve Feedback

### Tasks

- [x] For each prompt in history, show specific actionable suggestions.
- [x] Add "Quick Win" badge for prompts where adding one element (e.g., constraints) would jump score by 15+.
- [x] Show "Your Best Prompts" section: top 5 highest-scoring prompts as templates.
- [x] Show "Needs Improvement" section: bottom 5 lowest-scoring prompts with specific suggestions.

## Phase 5C: Prompt Score Trend

### Tasks

- [x] Chart: Average prompt score per day over the last 30 days.
- [x] Show improvement trajectory: "Your prompt quality improved by X% this month."
- [x] Identify categories where the user consistently scores low.

### Acceptance Criteria

- Every prompt has all 7 dimension scores stored.
- Users can see exactly WHERE they can improve each prompt.
- Score trends are visible over time.

---

# Phase 6: Enhanced Dashboard

**Goal:** Make the dashboard genuinely useful with all real data.

## Phase 6A: Conversation History View

### Tasks

- [x] Add "Conversations" tab to dashboard.
- [x] Show table: Source | Conversation ID | Workspace | Model | Turns | Tokens | Score | Started | Duration.
- [x] Group by workspace project.
- [x] Link to conversation details: list all prompts in that conversation.
- [x] Show conversation efficiency score per conversation.

## Phase 6B: Source Comparison View

### Tasks

- [x] Add visual comparison: CLI vs App vs IDE.
- [x] Metrics per source: sessions, prompts, tokens, avg score, most used model.
- [x] Time-of-day usage heatmap: when does the user use each source?

## Phase 6C: Model Usage Analytics

### Tasks

- [x] Show actual model distribution from all conversations.
- [x] Track model switches within conversations.
- [x] Show average token cost per model.
- [x] Show average prompt score per model.

---

# Phase 7: Notifications & Alerts (Real Data Only)

## Tasks

- [x] Context window approaching limit (>80%): Keep, this is real data.
- [x] Long conversation warning (>25 turns): Keep, derived from real data.
- [x] Weekly report ready notification: Keep.
- [x] Remove quota-based notifications since quota data is fake.
- [x] Add: "You've used {N}k tokens today across {N} prompts."
- [x] Add: "Prompt quality trend: Your last 5 prompts scored below 40."

---

# Phase 8: Export & Import (Updated)

## Tasks

- [x] Export includes source attribution per record.
- [x] Export includes per-prompt token estimates.
- [x] Markdown export generates a proper weekly/monthly report.
- [x] CSV export includes: timestamp, source, prompt, category, score, input_tokens, output_tokens, model, workspace.

---

# Phase 9: Testing & Quality

## Tasks

- [x] Add fixture transcripts from all three sources (CLI, App, IDE).
- [x] Test token estimation accuracy against known transcript sizes.
- [x] Test incremental sync: adding new steps to a transcript should only process new steps.
- [x] Test deduplication: same prompt should not be stored twice.
- [x] Test multi-source collection: ensure all 73+ conversations are found.
- [x] Test weekly report generation with various data distributions.
- [x] Performance test: scanning 73 conversations should complete in < 5 seconds.

---

# Phase 10: Performance & Polish

## Tasks

- [x] Lazy-load transcripts: don't parse all 73 on every sync.
- [x] Cache parsed data per conversation; only re-parse if file modified time changed.
- [x] Debounce dashboard updates to prevent flicker.
- [x] Add loading states for initial scan.
- [x] Add progress indicator for full historical scan.
- [x] Implement data retention: auto-delete records older than retention period.

---

# Implementation Priority Order

```text
WEEK 1 — Phase 1: Fix Data Foundation
├── Phase 1A: Multi-source collection (scan all 3 brain dirs)
├── Phase 1B: Fix transcript parsing (use full transcripts, better token estimation)
├── Phase 1C: Remove fake quota values
└── Phase 1D: Fix usage record duplication + prompt deduplication

WEEK 2 — Phase 2: Complete History Collection
├── Phase 2A: Full historical scan of all conversations
├── Phase 2B: Unified prompt history view with source attribution
└── Phase 2C: Per-prompt token accounting

WEEK 3 — Phase 3: Fix Weekly Report + Phase 4: Token Display
├── Phase 3A: Data-driven weekly report with real patterns
├── Phase 3B: Weekly report dashboard improvements
├── Phase 4A: Status bar with real token counts
└── Phase 4B: Dashboard overview cards with real data

WEEK 4 — Phase 5: Prompt Quality + Phase 6: Dashboard
├── Phase 5A: Store all dimension scores
├── Phase 5B: Where-to-improve feedback
├── Phase 6A: Conversation history view
└── Phase 6B: Source comparison view

WEEK 5 — Phase 7-10: Polish
├── Phase 7: Real-data notifications
├── Phase 8: Updated export
├── Phase 9: Testing
└── Phase 10: Performance
```

---

# Sprint 1 Acceptance Criteria (End of Week 1)

After completing Phase 1:

```text
✅ Extension scans all 73+ conversations from CLI + App + IDE
✅ Every conversation has correct source attribution
✅ Token estimates use cleaned content from transcript_full.jsonl
✅ No fake quota values shown anywhere
✅ Status bar shows model and state, not fake percentages
✅ Usage records are not duplicated every 30 seconds
✅ Prompts are stored per-conversation with deduplication
✅ Dashboard shows "Quota: Not available" instead of "85%"
```

# Sprint 2 Acceptance Criteria (End of Week 2)

After completing Phase 2:

```text
✅ All historical prompts from all sources visible in Prompt Coach tab
✅ Each prompt shows: source, category, score, input tokens, output tokens
✅ Users can filter prompts by source (CLI/App/IDE), category, date range
✅ Total token accounting per prompt is displayed
✅ Most expensive prompts are identifiable
```

# Sprint 3 Acceptance Criteria (End of Week 3)

After completing Phases 3 + 4:

```text
✅ Weekly report shows real data from the last 7 days
✅ Improvement suggestions are data-driven, not hardcoded
✅ Week-over-week comparison is shown
✅ Status bar shows actual daily token count
✅ Dashboard overview shows real token and request counts
✅ Charts display accurate data from per-prompt estimates
```

---

# Security Checklist

Before release:

- [x] No secrets committed to Git.
- [x] API keys use secure storage.
- [x] Prompts are local by default.
- [x] External AI disabled by default.
- [x] Secret redaction enabled.
- [x] Logs do not contain prompt content by default.
- [x] Export warns about sensitive information.
- [x] Database permissions checked.
- [x] Dependencies audited.
- [x] Extension permissions minimized.

---

# Definition of Done (v1.0)

The project is considered complete for v1.0 when:

- [x] All conversations from CLI, App, and IDE are collected.
- [x] Current model is displayed from settings.json.
- [x] Context usage is estimated from transcript data.
- [x] Quota shows "Unavailable" honestly (no fake values).
- [x] Usage is persisted locally with accurate token estimates.
- [x] Daily/weekly/monthly analytics use real per-prompt data.
- [x] Model usage is analyzed from actual conversation history.
- [x] Every prompt has per-prompt token cost visible.
- [x] Prompt quality is scored with all 7 dimensions stored.
- [x] Weekly report is data-driven with personalized insights.
- [x] Source attribution (CLI/App/IDE) is visible throughout.
- [x] Improvement suggestions are based on actual user patterns.
- [x] Privacy controls are available.
- [x] Secrets are redacted before storage.
- [x] Data can be exported/imported with source attribution.
- [x] Tests cover core functionality including multi-source collection.
- [x] Extension performs well with 73+ conversations.
- [x] No fake or hardcoded values appear in any UI element.
