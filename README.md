# Antigravity Usage Intelligence

> **Your personal AI usage analyst and prompting coach for Gemini Antigravity.**

A local-first VS Code extension that analyzes Gemini Antigravity usage, tracks tokens and quotas, scores prompt quality with transparent heuristics, recommends optimal models, and provides personalized productivity insights.

---

## 🌟 Key Features

### 1. Real-Time Status Bar
- **Active Model & Quota:** Displays the currently selected model, remaining quota percentage, and countdown until quota reset (e.g. `$(hubot) AG: Gemini 3.8 Flash | 85%`).
- **Context Window Indicator:** Monitors context window consumption with warning alerts at 80% and 90% threshold limits.
- **One-Click Access:** Click the status bar item to instantly open the Usage Intelligence Dashboard.

### 2. Comprehensive Usage Dashboard
A rich, tabbed React webview dashboard:
- **Overview:** Instant visibility into today's requests, total token burn, active model, and conversation sessions.
- **Usage & Tokens:** Input vs. output token charts, daily request counts, and 7-day / 30-day activity trends powered by Recharts.
- **Models:** Dynamic model distribution, showing request share and token consumption per model.
- **Prompt Coach & Sandbox:** An interactive prompt test bench. Type or paste any prompt to get a 0–100 heuristic quality score and generate an auto-structured, battle-tested prompt.
- **Personal Profile:** Analyzes your historical prompt patterns, highlighting prompting strengths, top categories, and high-impact areas for improvement.
- **Weekly Report:** Summarizes weekly sessions, total tokens consumed, average prompt score, most used models, and coaching goals.

### 3. Transparent Prompt Quality Engine (0–100 Heuristic)
Scores prompts across seven transparent dimensions:
- **Clarity (20 pts):** Actionable verbs, clear intent, non-vague phrasing.
- **Context (15 pts):** Code references, file names, framework and language identifiers.
- **Requirements (15 pts):** Explicit bullet-pointed or numbered requirements.
- **Constraints (15 pts):** Backward compatibility, boundaries, and performance limits.
- **Expected Output (15 pts):** Output format specifications (diffs, tests, types).
- **Acceptance Criteria (10 pts):** Test verification and success validation criteria.
- **Scope (10 pts):** Targeted, modular boundaries.

### 4. 1-Click Prompt Improver
Transforms raw, vague requests into structured, actionable prompts with context, requirements, constraints, and expected output sections.

### 5. Model Recommendation Engine
Provides evidence-based model recommendations based on task complexity, context length, and category, complete with confidence scores and reasoning.

### 6. Local-First & Privacy Assured
- **100% Local Storage:** Persisted locally in SQLite (`antigravity_analytics.db`).
- **No Cloud Backend Required:** Operates entirely on your machine.
- **Secret Redaction:** Automatically detects and redacts AWS keys, OpenAI/Gemini API keys, GitHub PATs, JWT tokens, Bearer tokens, and database connection URIs.
- **Export & Import:** Full support for exporting and importing data in JSON, CSV, and Markdown formats.

---

## ⌨️ Command Palette Reference

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and search for **Antigravity Usage**:

| Command | Description |
| :--- | :--- |
| `Antigravity Usage: Open Dashboard` | Opens the full analytics and prompt coach dashboard. |
| `Antigravity Usage: Refresh` | Triggers immediate sync with Antigravity CLI and transcripts. |
| `Antigravity Usage: Analyze Prompt` | Evaluates prompt quality for selected text or user input. |
| `Antigravity Usage: Improve Prompt` | Generates a structured, improved prompt in a side editor. |
| `Antigravity Usage: Show Today's Usage` | Displays a quick summary notification of today's tokens. |
| `Antigravity Usage: Show Model Usage` | Displays model distribution percentages. |
| `Antigravity Usage: Export Data` | Exports usage and prompt records to JSON, CSV, or Markdown. |
| `Antigravity Usage: Import Data` | Imports historical analytics data from JSON. |
| `Antigravity Usage: Open Settings` | Opens configuration settings. |
| `Antigravity Usage: Open Logs` | Opens the extension diagnostic output channel. |
| `Antigravity Usage: Reset Local Data` | Clears local database analytics history. |

---

## ⚙️ Configuration Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `antigravity.enableExtension` | `true` | Enable background monitoring. |
| `antigravity.refreshInterval` | `30` | Refresh interval in seconds. |
| `antigravity.retentionPeriodDays` | `90` | Number of days to retain usage history. |
| `antigravity.privacy.storePrompts` | `true` | Persist prompt text locally for quality scoring. |
| `antigravity.privacy.secretRedaction` | `true` | Automatically redact secrets before storage. |
| `antigravity.ui.contextWarningThreshold` | `80` | Context percentage that triggers a warning. |
| `antigravity.ui.contextCriticalThreshold` | `90` | Context percentage that triggers a critical alert. |

---

## 🏗️ Architecture

```text
                  Gemini Antigravity Runtime
                             │
       ┌─────────────────────┴─────────────────────┐
       ▼                                           ▼
  agy CLI / Status                            Transcripts
       │                                           │
       └─────────────────────┬─────────────────────┘
                             ▼
                   Antigravity Collector
                             │
                             ▼
                    Transcript & Parsers
                             │
                             ▼
                   Local SQLite Database
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
  Usage Analyzer      Prompt Analyzer       Model Analyzer
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ▼
                   Recommendation Engine
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
   Status Bar            Dashboard            Prompt Coach
```

---

## 🧪 Testing & Verification

Run the automated test suite with Vitest:

```bash
npm test
```

Build the webview and extension bundles:

```bash
npm run build
```

---

## 📄 License

MIT
