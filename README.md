# AI-Lens: Antigravity Usage Intelligence

> **Your personal AI usage analyst, token monitor, and prompt quality coach for Gemini Antigravity.**

[![Tests](https://img.shields.io/badge/tests-45%20passed-brightgreen.svg)](<>)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue.svg)](<>)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20local-success.svg)](<>)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**AI-Lens (Antigravity Usage Intelligence)** is a comprehensive, local-first VS Code extension designed to bring complete visibility and optimization to your Gemini Antigravity workflows. It monitors real-time token burn across all Antigravity runtimes (CLI, Desktop App, and Antigravity IDE), scores prompt effectiveness using transparent heuristics, alerts you before context window limits are breached, and delivers data-backed coaching to sharpen your AI interactions.

---

## 📑 Table of Contents

- [🌟 Key Features](#-key-features)
  - [1. Multi-Source Ingestion & History Tracking](#1-multi-source-ingestion--history-tracking)
  - [2. Real-Time Status Bar](#2-real-time-status-bar)
  - [3. 8-Tab Usage Intelligence Dashboard](#3-8-tab-usage-intelligence-dashboard)
  - [4. Heuristic Prompt Quality Engine (0–100 Scale)](#4-heuristic-prompt-quality-engine-0100-scale)
  - [5. 1-Click Prompt Improver](#5-1-click-prompt-improver)
  - [6. Model Recommendation Engine](#6-model-recommendation-engine)
  - [7. Privacy & Automatic Secret Redaction](#7-privacy--automatic-secret-redaction)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Option A: Install from VSIX Package](#option-a-install-from-vsix-package)
  - [Option B: Build & Run from Source](#option-b-build--run-from-source)
- [⌨️ Command Palette Reference](#️-command-palette-reference)
- [⚙️ Configuration Settings](#️-configuration-settings)
- [🏗️ System Architecture](#️-system-architecture)
- [🧪 Testing & Development](#-testing--development)
- [📄 License](#-license)

---

## 🌟 Key Features

### 1. Multi-Source Ingestion & History Tracking

AI-Lens automatically detects and synchronizes session data and prompt history across all Antigravity environments on your system:

- **Antigravity CLI:** Reads transcripts and `history.jsonl` from `~/.gemini/antigravity-cli/`.
- **Antigravity Desktop App:** Ingests conversation sessions and logs from `~/.gemini/antigravity/`.
- **Antigravity IDE:** Monitors workspaces and transcripts in `~/.gemini/antigravity-ide/`.
- **Deep Rescan Capability:** The `Rescan All History` command allows instant full backfilling of past interactions across all three sources.

### 2. Real-Time Status Bar

Stay informed directly from your VS Code status bar without interrupting your workflow:

- **Active Model Display:** Real-time visibility into the current active model (e.g. `Gemini 3.8 Flash (High)`).
- **Context Window Usage:** Continuous tracking of active conversation context tokens and percentage capacity.
- **Threshold Alerts:** Configurable status warnings at 80% (warning) and 90% (critical) context consumption to prevent abrupt context compaction or memory truncation.
- **Instant Launch:** Click the status bar item at any time to open the full dashboard.

### 3. 8-Tab Usage Intelligence Dashboard

An interactive React webview dashboard loaded with deep visual analytics:

1. **Overview:**
   - At-a-glance KPI cards: Active Model, Today's Tokens, Today's Prompt Count, This Week's Volume, and Average Prompt Score.
   - Dynamic context window progress bar with colored status thresholds.
   - 7-day token burn trendline powered by Recharts.
   - Quick action triggers: _Live Sync_ and _Rescan All History_.
2. **Usage & Tokens:**
   - Daily input vs. output token distribution charts.
   - Daily user prompt request counts.
   - **Tokens Burned by Category:** Clear breakdown of token expenditure across task categories (_Feature Implementation_, _Debugging_, _Refactoring_, _Explanation_, _Testing_, _Architecture_, and _General_).
3. **Prompt Coach & Interactive Sandbox:**
   - **Live Sandbox:** Type or paste any prompt into the test bench to receive immediate 0–100 heuristic scoring, a dimensional breakdown, and specific missing element warnings.
   - **1-Click Improver:** Auto-structure raw prompts into clear, context-rich, actionable instructions.
   - **Searchable Prompt History:** Filter historical prompts by source (_CLI_, _App_, _IDE_), filter by task category, search by keywords, and sort by date, token cost, or quality score.
   - **Expandable Diagnostic View:** View full prompt text, category tags, token counts, component scores, and targeted improvement suggestions for each past prompt.
4. **Conversations:**
   - Browse indexed sessions from all sources with conversation IDs, workspace folders, message counts, user turns, token totals, and last active timestamps.
   - Search sessions by ID, path, or model, with quick source-filtering tabs.
5. **Models:**
   - Request distribution and token share across all utilized models.
   - Evidence-based model recommendation advisor matching task scope and context size to the best-suited model.
6. **Source Comparison:**
   - Direct head-to-head comparison between Antigravity CLI, Desktop App, and Antigravity IDE.
   - Compare request volumes, input tokens, output tokens, total burn, and percentage shares.
7. **Personal Profile:**
   - Behavioral analysis of your personal prompting habits.
   - Pinpoints your top prompt strengths, most frequent task types, and highest-priority areas for improvement.
8. **Weekly Report:**
   - Executive weekly overview featuring week-over-week token volume change (`↑` / `↓` %) and prompt quality trend (`+` / `-` points).
   - **Top 5 Most Token-Intensive Prompts:** Pinpoints high-burn queries that drove heavy context or output consumption.
   - **Lowest-Scoring Prompts & Diagnostic Suggestions:** Highlights underperforming prompts and details exactly what elements were missing.
   - **Coaching Goals:** Actionable guidance for the upcoming week.

---

### 4. Heuristic Prompt Quality Engine (0–100 Scale)

Every prompt is evaluated deterministically against seven transparent, battle-tested prompt engineering dimensions:

| Dimension               | Weight | Criteria Checked                                                                                  |
| :---------------------- | :----: | :------------------------------------------------------------------------------------------------ |
| **Clarity**             | 20 pts | Starts with an actionable verb; avoids ambiguous or vague phrasing.                               |
| **Context**             | 15 pts | References file paths, symbols, functions, language, or framework context.                        |
| **Requirements**        | 15 pts | Outlines clear bulleted or numbered specifications.                                               |
| **Constraints**         | 15 pts | Defines explicit boundaries (e.g. backward compatibility, performance, no external dependencies). |
| **Expected Output**     | 15 pts | Specifies desired output format (e.g. code snippet, unified diff, unit tests, JSON).              |
| **Acceptance Criteria** | 10 pts | States success conditions or test verification steps.                                             |
| **Scope**               | 10 pts | Maintains a focused, achievable scope without unbounded multi-tasking.                            |

---

### 5. 1-Click Prompt Improver

Transforms raw or underspecified prompts into high-performance, structured templates:

- Automatically infers and injects missing sections: `[Context]`, `[Requirements]`, `[Constraints]`, and `[Expected Output]`.
- Side-by-side preview with a one-click **Copy to Clipboard** button.
- Available both inside the webview dashboard and directly from the VS Code editor via Command Palette or selection shortcuts.

---

### 6. Model Recommendation Engine

Provides intelligent model suggestions based on your task characteristics:

- Matches routine tasks or large-context code explorations to cost-effective, high-throughput models like `Gemini 3.8 Flash`.
- Escalates multi-file refactoring, deep architectural reasoning, and complex logic tasks to high-capacity reasoning models.
- Transparent rationale and confidence ratings are provided for every recommendation.

---

### 7. Privacy & Automatic Secret Redaction

Your code and prompts never leave your local environment:

- **100% Local SQLite Store:** All analytics, session indexes, and scores are stored in a local SQLite database (`antigravity_analytics.db`) located in your global extension storage directory.
- **Zero Cloud Requirement:** The core analytics and heuristic scoring engines run entirely offline.
- **Built-In Secret Redaction:** Built-in pattern recognition automatically strips sensitive credentials before writing to disk:
  - AWS Access Keys & Secret Keys
  - GitHub Personal Access Tokens (`ghp_`, `gho_`, etc.)
  - OpenAI API Keys (`sk-...`) and Gemini API Keys (`AIza...`)
  - JSON Web Tokens (JWT) & HTTP Bearer Tokens
  - Database Connection Strings (`postgres://`, `mongodb://`, `mysql://`)
- **Export & Import Controls:** Freely export your sanitized database records to JSON, CSV, or Markdown, or wipe historical data at any time with a single command.

---

## 🚀 Getting Started

### Prerequisites

- **VS Code:** Version `1.85.0` or higher (or compatible forks like Cursor or VSCodium).
- **Gemini Antigravity:** At least one of Antigravity CLI, Desktop App, or Antigravity IDE installed on your system.

---

### Option A: Install from VSIX Package

If you have the precompiled `.vsix` file:

1. **Install via Command Line:**
   ```bash
   code --install-extension antigravity-usage-intelligence-0.1.0.vsix
   ```
2. **Install via VS Code UI:**
   - Open VS Code.
   - Go to the **Extensions** view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
   - Click the `...` (Views and More Actions) menu in the top right.
   - Select **Install from VSIX...** and pick `antigravity-usage-intelligence-0.1.0.vsix`.
   - Reload VS Code when prompted.

---

### Option B: Build & Run from Source

To build and run the extension locally:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/antigravity/antigravity-usage-intelligence.git
   cd antigravity-usage-intelligence
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the webview and extension:**

   ```bash
   npm run build
   ```

4. **Launch Extension in Development Mode:**
   - Open the project directory in VS Code.
   - Press `F5` (or go to **Run and Debug** -> **Run Extension**).
   - A new **Extension Development Host** window will open with AI-Lens loaded and running.

---

## ⌨️ Command Palette Reference

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type `Antigravity Usage`:

| Command                | Identifier                     | Description                                                                  |
| :--------------------- | :----------------------------- | :--------------------------------------------------------------------------- |
| **Open Dashboard**     | `antigravity.openDashboard`    | Opens the full 8-tab Usage Intelligence & Prompt Coach webview.              |
| **Refresh**            | `antigravity.refresh`          | Triggers a live sync with Antigravity CLI status and latest transcripts.     |
| **Rescan All History** | `antigravity.rescanAllHistory` | Deep-scans CLI, App, and IDE directories, including `history.jsonl`.         |
| **Analyze Prompt**     | `antigravity.analyzePrompt`    | Runs the heuristic quality analyzer on selected text or typed prompt.        |
| **Improve Prompt**     | `antigravity.improvePrompt`    | Generates an auto-structured, production-ready prompt in an editor tab.      |
| **Show Today's Usage** | `antigravity.showTodayUsage`   | Displays an instant notification badge with today's token & request counts.  |
| **Show Model Usage**   | `antigravity.showModelUsage`   | Displays model distribution percentages across your recent tasks.            |
| **Export Data**        | `antigravity.exportData`       | Exports stored usage, session, and prompt metrics to JSON, CSV, or Markdown. |
| **Import Data**        | `antigravity.importData`       | Imports previously exported analytics data into your local database.         |
| **Open Settings**      | `antigravity.openSettings`     | Directly opens AI-Lens configuration preferences in VS Code Settings.        |
| **Open Logs**          | `antigravity.openLogs`         | Reveals the extension diagnostic output channel for troubleshooting.         |
| **Reset Local Data**   | `antigravity.resetLocalData`   | Safely purges local SQLite analytics history after user confirmation.        |

---

## ⚙️ Configuration Settings

Configure AI-Lens via `Settings` (`Ctrl+,`) under **Extensions** -> **Antigravity Usage Intelligence**:

| Setting Key                                  |   Type    |          Default           | Description                                                                                    |
| :------------------------------------------- | :-------: | :------------------------: | :--------------------------------------------------------------------------------------------- |
| `antigravity.enableExtension`                | `boolean` |           `true`           | Enables or disables background usage monitoring.                                               |
| `antigravity.refreshInterval`                | `number`  |            `30`            | Background synchronization interval in seconds.                                                |
| `antigravity.retentionPeriodDays`            | `number`  |            `90`            | Number of days to retain historical usage and prompt records.                                  |
| `antigravity.privacy.storePrompts`           | `boolean` |           `true`           | Persists user prompt text locally for quality scoring and analytics.                           |
| `antigravity.privacy.storeSourceCode`        | `boolean` |          `false`           | Whether to persist source code blocks detected inside prompts.                                 |
| `antigravity.privacy.secretRedaction`        | `boolean` |           `true`           | Automatically redacts API keys, tokens, and credentials before saving.                         |
| `antigravity.privacy.externalAiAnalysis`     | `boolean` |          `false`           | Allows optional external AI providers for prompt improvements (off by default).                |
| `antigravity.analytics.promptScoring`        | `boolean` |           `true`           | Enables the 7-dimension prompt quality scoring engine.                                         |
| `antigravity.analytics.modelRecommendations` | `boolean` |           `true`           | Enables evidence-based model recommendations in the dashboard.                                 |
| `antigravity.analytics.conversationAnalysis` | `boolean` |           `true`           | Enables conversation efficiency metrics and repetition checks.                                 |
| `antigravity.analytics.forecasting`          | `boolean` |           `true`           | Computes quota trends and context consumption trajectories.                                    |
| `antigravity.ui.statusBar`                   | `boolean` |           `true`           | Controls the visibility of the status bar item.                                                |
| `antigravity.ui.notifications`               | `boolean` |           `true`           | Shows pop-up notifications for critical context limits and alerts.                             |
| `antigravity.ui.contextWarningThreshold`     | `number`  |            `80`            | Context window percentage threshold that triggers a warning.                                   |
| `antigravity.ui.contextCriticalThreshold`    | `number`  |            `90`            | Context window percentage threshold that triggers a critical alert.                            |
| `antigravity.ai.provider`                    |  `enum`   |         `"gemini"`         | AI provider for optional external prompt enhancement (`gemini`, `openai`, `claude`, `ollama`). |
| `antigravity.ai.model`                       | `string`  |    `"gemini-1.5-flash"`    | Target model ID for optional external AI enhancements.                                         |
| `antigravity.ai.ollamaEndpoint`              | `string`  | `"http://localhost:11434"` | Endpoint URL when using local Ollama for prompt improvement.                                   |

---

## 🏗️ System Architecture

```text
               Gemini Antigravity Ecosystem
  ┌───────────────────────────┼───────────────────────────┐
  ▼                           ▼                           ▼
Antigravity CLI        Desktop App (App)          Antigravity IDE
(~/.gemini/antigravity-cli) (~/.gemini/antigravity)     (~/.gemini/antigravity-ide)
  │                           │                           │
  ├─ presence / locks         ├─ transcripts              ├─ transcripts
  ├─ history.jsonl            └─ settings.json            └─ workspace sessions
  └─ transcripts (compact & full)
  │                           │                           │
  └───────────────────────────┬───────────────────────────┘
                              ▼
                   Multi-Source Collectors
     [AntigravityCollector]  [HistoryCollector]  [QuotaCollector]
                              │
                              ▼
                      Parsers & Ingestion
       [TranscriptParser]  [StatusParser]  [ModelParser]
                              │
                              ▼
                 Privacy & Secret Sanitizer
                    [SecretRedactorService]
                              │
                              ▼
                   Local SQLite Database
                (antigravity_analytics.db)
                - Sessions, Prompts, Usages
                - Source & Category Tracking
                - Automatic Schema Migrations
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  Usage Analyzer        Prompt Analyzer       Model Analyzer
  - Daily & Weekly      - 7 Dimensions (0-100)- Task Complexity Matching
  - Tokens by Category  - Heuristic Rules     - Cost/Latency Profiling
  - Source Breakdown    - Diagnostic Feedback - Recommendation Engine
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                     Presentation Layers
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
   VS Code Status Bar                      React Webview Dashboard
   - Active Model & State                 - 8 Specialized Tabs
   - Live Context % & Bar                 - Recharts Visualizations
   - 80% / 90% Warning Alerts             - Interactive Prompt Sandbox
```

---

## 🧪 Testing & Development

The project is thoroughly tested with automated unit and integration tests using Vitest.

### Run Unit Tests

```bash
npm test
```

_(On Windows PowerShell, use `npm.cmd test` if script execution is restricted)._

### Build Extension & Webview

```bash
npm run build
```

This triggers both:

- `npm run build:webview`: Compiles the React + Vite frontend to `dist/webview/`.
- `npm run build:extension`: Bundles the Node.js extension backend via `esbuild` to `dist/extension.js`.

### Package VSIX Extension

```bash
npm run package
```

Generates a production `.vsix` file ready for distribution and installation.

### Code Formatting & Linting

```bash
npm run lint
npm run format
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for complete details.
