import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SyncService } from '../services/syncService';
import { UsageRepository } from '../database/repositories/usageRepository';
import { PromptRepository } from '../database/repositories/promptRepository';
import { SessionRepository } from '../database/repositories/sessionRepository';
import { QuotaRepository } from '../database/repositories/quotaRepository';
import { UsageAnalyzer } from '../analytics/usageAnalyzer';
import { QuotaPredictor } from '../analytics/quotaPredictor';
import { PromptAnalyzer } from '../analytics/promptAnalyzer';
import { PromptImprover } from '../analytics/promptImprover';
import { ModelRecommendationEngine } from '../recommendations/modelRecommendation';
import { AntigravityCollector } from '../collectors/antigravityCollector';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    syncService: SyncService,
    usageRepo: UsageRepository,
    promptRepo: PromptRepository,
    sessionRepo: SessionRepository,
    quotaRepo: QuotaRepository,
    antigravityCollector: AntigravityCollector
  ): DashboardPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.panel.reveal(column);
      DashboardPanel.currentPanel.sendData();
      return DashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'antigravityDashboard',
      'Antigravity Usage Intelligence',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')]
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      syncService,
      usageRepo,
      promptRepo,
      sessionRepo,
      quotaRepo,
      antigravityCollector
    );
    return DashboardPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private syncService: SyncService,
    private usageRepo: UsageRepository,
    private promptRepo: PromptRepository,
    private sessionRepo: SessionRepository,
    private quotaRepo: QuotaRepository,
    private antigravityCollector: AntigravityCollector
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'icon.png');
    this.panel.webview.html = this.getHtmlForWebview();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ready':
          case 'getDashboardData':
            await this.sendData();
            break;
          case 'refresh':
            await this.syncService.sync();
            await this.sendData();
            break;
          case 'rescanAll':
            await this.syncService.scanAllHistory();
            await this.sendData();
            vscode.window.showInformationMessage('Indexed all conversations across CLI, Desktop App, and IDE.');
            break;
          case 'analyzePrompt': {
            const analysis = PromptAnalyzer.analyze(message.prompt);
            this.panel.webview.postMessage({
              type: 'promptAnalyzed',
              analysis
            });
            break;
          }
          case 'improvePrompt': {
            const improved = PromptImprover.improve(message.prompt);
            this.panel.webview.postMessage({
              type: 'promptImproved',
              improved
            });
            break;
          }
          case 'recommendModel': {
            const models = await this.antigravityCollector.fetchAvailableModels();
            const rec = ModelRecommendationEngine.recommend({
              prompt: message.prompt,
              category: message.category || 'Development',
              availableModels: models.map((m) => m.name)
            });
            this.panel.webview.postMessage({
              type: 'modelRecommended',
              recommendation: rec
            });
            break;
          }
          case 'copyToClipboard':
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Copied to clipboard!');
            break;
        }
      },
      null,
      this.disposables
    );

    // Subscribe to sync updates
    this.syncService.onSnapshotUpdated(() => {
      this.sendData();
    });
  }

  public async sendData(): Promise<void> {
    const snapshot = this.syncService.getLastSnapshot();
    const todaySummary = this.usageRepo.getTodaySummary();
    const weekSummary = this.usageRepo.getWeekSummary();
    const currentModel = this.antigravityCollector.getCurrentModel();
    const dailyUsage = this.usageRepo.getDailyUsage(30);
    const modelUsage = this.usageRepo.getModelUsage();
    const usageBySource = this.usageRepo.getUsageBySource();
    const tokensByCategory = this.usageRepo.getTokensByCategory();
    const recentPrompts = this.promptRepo.getRecent(500);
    const recentSessions = this.sessionRepo.getRecent(100);
    const expensivePrompts = this.promptRepo.getExpensivePrompts(20000, 10);
    const categoryDistribution = this.promptRepo.getCategoryDistribution();
    const avgScore = this.promptRepo.getAverageScore();
    const profile = UsageAnalyzer.generateProfile(
      recentPrompts.slice(0, 100),
      recentSessions,
      dailyUsage as any
    );
    const forecast = QuotaPredictor.forecast(
      dailyUsage as any,
      this.quotaRepo.getLatest()
    );
    const weeklyReport = UsageAnalyzer.generateWeeklyReport(
      recentPrompts,
      recentSessions,
      dailyUsage as any,
      modelUsage
    );

    this.panel.webview.postMessage({
      type: 'dashboardData',
      payload: {
        snapshot,
        todaySummary,
        weekSummary,
        currentModel,
        dailyUsage,
        modelUsage,
        usageBySource,
        tokensByCategory,
        recentPrompts,
        recentSessions,
        expensivePrompts,
        categoryDistribution,
        avgScore,
        profile,
        forecast,
        weeklyReport
      }
    });
  }

  private getHtmlForWebview(): string {
    const webviewDistDir = path.join(this.extensionUri.fsPath, 'dist', 'webview');
    const indexPath = path.join(webviewDistDir, 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      // Replace asset paths with webview URIs
      html = html.replace(/(href|src)="\.\/assets\/(.*?)"/g, (match, attr, asset) => {
        const assetUri = this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', asset)
        );
        return `${attr}="${assetUri}"`;
      });
      return html;
    }

    // Modern fallback interactive UI if webview build bundle is not present yet
    return this.getFallbackHtml();
  }

  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity Usage Intelligence</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e2e);
      --card-bg: var(--vscode-editorWidget-background, #181825);
      --border: var(--vscode-widget-border, #313244);
      --text: var(--vscode-editor-foreground, #cdd6f4);
      --subtext: var(--vscode-descriptionForeground, #a6adc8);
      --primary: var(--vscode-button-background, #89b4fa);
      --primary-fg: var(--vscode-button-foreground, #11111b);
      --accent: #a6e3a1;
      --warning: #f9e2af;
      --danger: #f38ba8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    .title-group h1 { font-size: 22px; font-weight: 700; color: #fff; }
    .title-group p { font-size: 13px; color: var(--subtext); }
    .btn {
      background: var(--primary);
      color: var(--primary-fg);
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
    .btn:hover { opacity: 0.9; }
    .btn-secondary {
      background: var(--card-bg);
      color: var(--text);
      border: 1px solid var(--border);
      margin-left: 8px;
    }
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }
    .tab {
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--subtext);
    }
    .tab.active {
      background: var(--card-bg);
      color: #fff;
      border: 1px solid var(--border);
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .card-label { font-size: 12px; color: var(--subtext); text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 24px; font-weight: 700; margin: 8px 0; color: #fff; }
    .card-sub { font-size: 12px; color: var(--accent); }
    .progress-bar-bg {
      background: var(--border);
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--primary);
      width: 0%;
      transition: width 0.3s;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--subtext); font-weight: 600; }
    .score-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 11px;
    }
    .score-high { background: rgba(166, 227, 161, 0.2); color: #a6e3a1; }
    .score-mid { background: rgba(249, 226, 175, 0.2); color: #f9e2af; }
    .score-low { background: rgba(243, 139, 168, 0.2); color: #f38ba8; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    textarea {
      width: 100%;
      min-height: 90px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
    }
    .flex-row { display: flex; gap: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h1>🚀 Antigravity Usage Intelligence</h1>
      <p>Multi-Source Analytics (CLI, Desktop App, IDE), Quality Scoring & Token Tracking</p>
    </div>
    <div>
      <button class="btn" id="btn-refresh">Live Sync</button>
      <button class="btn btn-secondary" id="btn-rescan">Rescan All History</button>
    </div>
  </div>

  <div class="tabs">
    <div class="tab active" data-tab="overview">Overview</div>
    <div class="tab" data-tab="prompts">Prompt Coach & History</div>
    <div class="tab" data-tab="models">Models & Sources</div>
    <div class="tab" data-tab="profile">Personal Profile</div>
    <div class="tab" data-tab="report">Weekly Report</div>
  </div>

  <!-- OVERVIEW TAB -->
  <div id="tab-overview" class="tab-content active">
    <div class="grid-4" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
      <div class="card">
        <div class="card-label">Current Model</div>
        <div class="card-value" id="val-model" style="font-size: 18px; word-break: break-word;">--</div>
        <div class="card-sub" id="val-agent-state">Runtime: IDLE</div>
      </div>
      <div class="card">
        <div class="card-label">Today's Tokens</div>
        <div class="card-value" id="val-today-tokens" style="color: #89b4fa;">0</div>
        <div class="card-sub" id="val-requests">0 prompts</div>
      </div>
      <div class="card">
        <div class="card-label">This Week</div>
        <div class="card-value" id="val-week-tokens" style="color: #cba6f7;">0</div>
        <div class="card-sub" id="val-week-prompts">0 prompts</div>
      </div>
      <div class="card">
        <div class="card-label">Avg Prompt Score</div>
        <div class="card-value" id="val-avg-score" style="color: #f9e2af;">--/100</div>
        <div class="card-sub" id="val-context">Context: 0%</div>
      </div>
      <div class="card">
        <div class="card-label">Remaining Quota</div>
        <div class="card-value" id="val-quota" style="font-size: 18px; color: var(--subtext);">Unavailable</div>
        <div class="card-sub" id="val-reset">Not exposed locally</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div class="card-label">Context Window Usage (Active Session)</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" id="val-context-bar"></div>
      </div>
      <p style="font-size: 12px; color: var(--subtext); margin-top: 6px;" id="val-context-detail">0 / 1,000,000 tokens (0%)</p>
    </div>

    <div class="card">
      <div class="section-title">All Conversations (CLI, Desktop App, IDE)</div>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Conversation ID</th>
            <th>Model</th>
            <th>Steps</th>
            <th>Est. Tokens</th>
            <th>State</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody id="sessions-table-body">
          <tr><td colspan="7" style="text-align: center; color: var(--subtext);">Loading conversations...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PROMPT COACH TAB -->
  <div id="tab-prompts" class="tab-content">
    <div class="card" style="margin-bottom: 20px;">
      <div class="section-title">Interactive Prompt Quality Coach & Analyzer</div>
      <p style="font-size: 13px; color: var(--subtext); margin-bottom: 12px;">
        Type or paste any prompt to analyze it across 7 dimensions (Clarity, Context, Requirements, Constraints, Expected Output, Acceptance Criteria, Scope).
      </p>
      <textarea id="coach-prompt-input" placeholder="e.g. Implement authentication middleware for Node.js Express service with JWT token verification and unit tests..."></textarea>
      <div class="flex-row">
        <button class="btn" id="btn-analyze-prompt">Analyze Quality</button>
        <button class="btn btn-secondary" id="btn-improve-prompt">Generate Improved Prompt</button>
      </div>

      <div id="coach-result" style="margin-top: 16px; display: none;">
        <hr style="border: 0; border-top: 1px solid var(--border); margin: 16px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 id="coach-score-text" style="font-size: 18px; color: #fff;">Score: 0/100</h3>
          <span id="coach-category-badge" class="score-badge score-mid">Category: Development</span>
        </div>
        <div id="coach-dimensions" style="margin: 12px 0; font-size: 13px;"></div>
        <div id="coach-missing" style="color: var(--danger); font-size: 13px; margin-bottom: 8px;"></div>
        <div id="coach-strengths" style="color: var(--accent); font-size: 13px; margin-bottom: 8px;"></div>
        <div id="coach-improved-box" style="display: none; margin-top: 12px;">
          <div class="card-label">Improved Structured Prompt:</div>
          <textarea id="coach-improved-text" readonly style="min-height: 120px;"></textarea>
          <button class="btn btn-secondary" id="btn-copy-improved" style="margin-top: 8px;">Copy to Clipboard</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div class="section-title" style="margin-bottom: 0;">Prompt History & Token Usage (All Sources)</div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="input-search-prompts" placeholder="Search prompts..." style="background:var(--bg); border:1px solid var(--border); color:var(--text); padding:4px 8px; border-radius:4px; font-size:12px; min-width: 180px;">
          <select id="select-source-filter" style="background:var(--bg); border:1px solid var(--border); color:var(--text); padding:4px 8px; border-radius:4px; font-size:12px;">
            <option value="all">All Sources</option>
            <option value="cli">📟 CLI</option>
            <option value="app">🖥️ App</option>
            <option value="ide">💻 IDE</option>
          </select>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Prompt</th>
            <th>Category</th>
            <th>Est. Tokens</th>
            <th>Score</th>
            <th>Missing Elements</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody id="prompts-table-body">
          <tr><td colspan="7" style="text-align: center; color: var(--subtext);">No prompts recorded yet</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- MODELS TAB -->
  <div id="tab-models" class="tab-content">
    <div class="card" style="margin-bottom: 20px;">
      <div class="section-title">Model Usage Distribution</div>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Requests</th>
            <th>Share</th>
            <th>Input Tokens</th>
            <th>Output Tokens</th>
          </tr>
        </thead>
        <tbody id="models-table-body">
          <tr><td colspan="5" style="text-align: center; color: var(--subtext);">Loading model statistics...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PROFILE TAB -->
  <div id="tab-profile" class="tab-content">
    <div class="grid-4" style="margin-bottom: 20px;">
      <div class="card">
        <div class="card-label">Total Prompts</div>
        <div class="card-value" id="profile-prompts">0</div>
      </div>
      <div class="card">
        <div class="card-label">Avg Prompt Length</div>
        <div class="card-value" id="profile-chars">0 chars</div>
      </div>
      <div class="card">
        <div class="card-label">Top Category</div>
        <div class="card-value" id="profile-top-cat">Development</div>
      </div>
      <div class="card">
        <div class="card-label">Total Sessions</div>
        <div class="card-value" id="profile-sessions">0</div>
      </div>
    </div>

    <div class="grid-4" style="grid-template-columns: 1fr 1fr;">
      <div class="card">
        <div class="section-title" style="color: var(--accent);">Identified Strengths</div>
        <ul id="profile-strengths" style="padding-left: 18px; font-size: 13px;"></ul>
      </div>
      <div class="card">
        <div class="section-title" style="color: var(--warning);">Coaching & Improvement Areas</div>
        <ul id="profile-improvements" style="padding-left: 18px; font-size: 13px;"></ul>
      </div>
    </div>
  </div>

  <!-- WEEKLY REPORT TAB -->
  <div id="tab-report" class="tab-content">
    <div class="card">
      <div class="section-title">📊 Weekly Antigravity Usage Intelligence Report</div>
      <div style="font-size: 14px; margin-top: 12px; line-height: 1.8;" id="report-content">
        Loading weekly insights...
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Tab Navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('btn-refresh').addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
    });

    const rescanBtn = document.getElementById('btn-rescan');
    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'rescanAll' });
      });
    }

    document.getElementById('btn-analyze-prompt').addEventListener('click', () => {
      const prompt = document.getElementById('coach-prompt-input').value;
      if (!prompt.trim()) return;
      vscode.postMessage({ command: 'analyzePrompt', prompt });
    });

    document.getElementById('btn-improve-prompt').addEventListener('click', () => {
      const prompt = document.getElementById('coach-prompt-input').value;
      if (!prompt.trim()) return;
      vscode.postMessage({ command: 'improvePrompt', prompt });
    });

    document.getElementById('btn-copy-improved').addEventListener('click', () => {
      const text = document.getElementById('coach-improved-text').value;
      vscode.postMessage({ command: 'copyToClipboard', text });
    });

    let lastDashboardData = null;

    document.getElementById('input-search-prompts')?.addEventListener('input', () => {
      if (lastDashboardData) renderFilteredPrompts(lastDashboardData);
    });

    document.getElementById('select-source-filter')?.addEventListener('change', () => {
      if (lastDashboardData) renderFilteredPrompts(lastDashboardData);
    });

    // Listen to messages from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'dashboardData') {
        lastDashboardData = msg.payload;
        renderDashboard(msg.payload);
      } else if (msg.type === 'promptAnalyzed') {
        renderPromptAnalysis(msg.analysis);
      } else if (msg.type === 'promptImproved') {
        const box = document.getElementById('coach-improved-box');
        box.style.display = 'block';
        document.getElementById('coach-improved-text').value = msg.improved;
      }
    });

    function renderFilteredPrompts(data) {
      const q = (document.getElementById('input-search-prompts')?.value || '').toLowerCase();
      const src = document.getElementById('select-source-filter')?.value || 'all';
      const promptsBody = document.getElementById('prompts-table-body');
      if (!promptsBody || !data.recentPrompts) return;

      const filtered = data.recentPrompts.filter(p => {
        if (src !== 'all' && p.source !== src) return false;
        if (q && !p.prompt.toLowerCase().includes(q) && !(p.category || '').toLowerCase().includes(q)) return false;
        return true;
      });

      if (filtered.length === 0) {
        promptsBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--subtext);">No matching prompts found</td></tr>';
        return;
      }

      promptsBody.innerHTML = filtered.map(p => {
        const scoreClass = p.prompt_score >= 80 ? 'score-high' : p.prompt_score >= 50 ? 'score-mid' : 'score-low';
        const srcBadge = p.source === 'ide' ? '💻 IDE' : p.source === 'app' ? '🖥️ App' : '📟 CLI';
        const tokens = (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0);
        const tokenStr = tokens > 0 ? tokens.toLocaleString() + ' tk' : '--';
        return \`
          <tr>
            <td><span class="score-badge" style="background:rgba(137,180,250,0.2);color:#89b4fa">\${srcBadge}</span></td>
            <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${p.prompt.replace(/"/g, '&quot;')}">\${p.prompt}</td>
            <td>\${p.category}</td>
            <td><strong>\${tokenStr}</strong></td>
            <td><span class="score-badge \${scoreClass}">\${p.prompt_score}/100</span></td>
            <td style="color: var(--subtext); font-size: 11px;">\${p.missing_items || 'None'}</td>
            <td style="font-size: 11px;">\${p.timestamp ? p.timestamp.slice(0, 16).replace('T', ' ') : '--'}</td>
          </tr>
        \`;
      }).join('');
    }

    function renderDashboard(data) {
      if (!data) return;
      const snap = data.snapshot || {};
      const today = data.todaySummary || {};
      const week = data.weekSummary || {};

      const modelEl = document.getElementById('val-model');
      if (modelEl) modelEl.textContent = data.currentModel || snap.model || 'Gemini 3.8 Flash';

      const stateEl = document.getElementById('val-agent-state');
      if (stateEl) stateEl.textContent = 'Runtime: ' + (snap.agentState || 'IDLE');

      const quotaEl = document.getElementById('val-quota');
      if (quotaEl) quotaEl.textContent = 'Unavailable';

      const resetEl = document.getElementById('val-reset');
      if (resetEl) resetEl.textContent = 'Not exposed locally';

      const todayTokensEl = document.getElementById('val-today-tokens');
      if (todayTokensEl) todayTokensEl.textContent = (today.tokens || 0).toLocaleString();

      const reqEl = document.getElementById('val-requests');
      if (reqEl) reqEl.textContent = (today.requests || 0) + ' prompts';

      const weekTokensEl = document.getElementById('val-week-tokens');
      if (weekTokensEl) weekTokensEl.textContent = (week.tokens || 0).toLocaleString() + ' tk';

      const weekPromptsEl = document.getElementById('val-week-prompts');
      if (weekPromptsEl) weekPromptsEl.textContent = (week.requests || 0) + ' prompts';

      const scoreEl = document.getElementById('val-avg-score');
      if (scoreEl) scoreEl.textContent = (data.avgScore || 0) + '/100';

      const ctxPercent = snap.contextPercentage || 0;
      const ctxEl = document.getElementById('val-context');
      if (ctxEl) ctxEl.textContent = 'Context: ' + ctxPercent + '%';

      const ctxBar = document.getElementById('val-context-bar');
      if (ctxBar) ctxBar.style.width = ctxPercent + '%';

      const ctxDetail = document.getElementById('val-context-detail');
      if (ctxDetail) {
        ctxDetail.textContent =
          ((snap.contextTokens || 0) / 1000).toFixed(1) + 'k / ' + (snap.contextWindow / 1000).toFixed(0) + 'k tokens (' + ctxPercent + '%)';
      }

      // Sessions
      const sessionsBody = document.getElementById('sessions-table-body');
      if (data.recentSessions && data.recentSessions.length > 0) {
        sessionsBody.innerHTML = data.recentSessions.map(s => {
          const srcBadge = s.source === 'ide' ? '💻 IDE' : s.source === 'app' ? '🖥️ App' : '📟 CLI';
          const tokens = (s.total_estimated_input_tokens || 0) + (s.total_estimated_output_tokens || 0);
          const tokenStr = tokens > 0 ? tokens.toLocaleString() : '--';
          return \`
          <tr>
            <td><span class="score-badge" style="background:rgba(137,180,250,0.2);color:#89b4fa">\${srcBadge}</span></td>
            <td style="font-family: monospace;">\${s.conversation_id.slice(0, 12)}...</td>
            <td>\${s.model || 'Gemini'}</td>
            <td>\${s.step_count}</td>
            <td>\${tokenStr}</td>
            <td><span class="score-badge \${s.agent_state === 'RUNNING' ? 'score-high' : 'score-mid'}">\${s.agent_state}</span></td>
            <td>\${s.started_at ? s.started_at.slice(0, 16).replace('T', ' ') : '--'}</td>
          </tr>
        \`;
        }).join('');
      }

      // Prompts
      const promptsBody = document.getElementById('prompts-table-body');
      if (data.recentPrompts && data.recentPrompts.length > 0) {
        promptsBody.innerHTML = data.recentPrompts.map(p => {
          const scoreClass = p.prompt_score >= 80 ? 'score-high' : p.prompt_score >= 50 ? 'score-mid' : 'score-low';
          const srcBadge = p.source === 'ide' ? '💻 IDE' : p.source === 'app' ? '🖥️ App' : '📟 CLI';
          const tokens = (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0);
          const tokenStr = tokens > 0 ? tokens.toLocaleString() + ' tk' : '--';
          return \`
            <tr>
              <td><span class="score-badge" style="background:rgba(137,180,250,0.2);color:#89b4fa">\${srcBadge}</span></td>
              <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${p.prompt}</td>
              <td>\${p.category}</td>
              <td><strong>\${tokenStr}</strong></td>
              <td><span class="score-badge \${scoreClass}">\${p.prompt_score}/100</span></td>
              <td style="color: var(--subtext); font-size: 11px;">\${p.missing_items || 'None'}</td>
              <td style="font-size: 11px;">\${p.timestamp ? p.timestamp.slice(0, 16).replace('T', ' ') : '--'}</td>
            </tr>
          \`;
        }).join('');
      }

      // Models
      const modelsBody = document.getElementById('models-table-body');
      if (data.modelUsage && data.modelUsage.length > 0) {
        modelsBody.innerHTML = data.modelUsage.map(m => \`
          <tr>
            <td><strong>\${m.model}</strong></td>
            <td>\${m.requestCount}</td>
            <td>\${m.percentage}%</td>
            <td>\${m.inputTokens.toLocaleString()}</td>
            <td>\${m.outputTokens.toLocaleString()}</td>
          </tr>
        \`).join('');
      }

      // Profile
      if (data.profile) {
        document.getElementById('profile-prompts').textContent = data.profile.totalPrompts;
        document.getElementById('profile-chars').textContent = data.profile.avgPromptLength + ' chars';
        document.getElementById('profile-top-cat').textContent = data.profile.topCategories?.[0]?.category || 'Development';
        document.getElementById('profile-sessions').textContent = data.profile.totalSessions;

        const strengthsList = document.getElementById('profile-strengths');
        strengthsList.innerHTML = (data.profile.strengths || []).map(s => \`<li>\${s}</li>\`).join('');

        const improvList = document.getElementById('profile-improvements');
        improvList.innerHTML = (data.profile.improvementAreas || []).map(s => \`<li>\${s}</li>\`).join('');
      }

      // Weekly Report
      if (data.weeklyReport) {
        const wr = data.weeklyReport;
        let expensiveHtml = '';
        if (wr.topExpensivePrompts && wr.topExpensivePrompts.length > 0) {
          expensiveHtml = \`
            <h4 style="margin-top: 16px; color: #fff;">🔥 Top Token-Intensive Prompts This Week:</h4>
            <ul style="padding-left: 20px; font-size: 12px; margin-top: 6px;">
              \${wr.topExpensivePrompts.map(p => \`
                <li style="margin-bottom: 4px;">
                  <strong>\${p.tokens.toLocaleString()} tk</strong>: "\${p.prompt.slice(0, 80)}..." (\${p.category})
                </li>
              \`).join('')}
            </ul>
          \`;
        }

        let diagHtml = '';
        if (wr.lowestScoringPrompts && wr.lowestScoringPrompts.length > 0) {
          diagHtml = \`
            <h4 style="margin-top: 16px; color: var(--warning);">⚠️ Low Scoring Prompt Diagnostics:</h4>
            <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">
              \${wr.lowestScoringPrompts.map(lp => \`
                <div style="background: var(--card-bg); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--border);">
                  <div><strong>"\${lp.prompt.slice(0, 70)}..."</strong> <span class="score-badge score-low">\${lp.score}/100</span></div>
                  <div style="color: var(--accent); font-size: 11px; margin-top: 2px;">💡 \${lp.suggestion}</div>
                </div>
              \`).join('')}
            </div>
          \`;
        }

        document.getElementById('report-content').innerHTML = \`
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px;">
            <div class="card" style="padding: 10px;">
              <div class="card-label">Prompts</div>
              <div style="font-size: 18px; font-weight: 700; color: #fff;">\${wr.promptsCount}</div>
            </div>
            <div class="card" style="padding: 10px;">
              <div class="card-label">Tokens</div>
              <div style="font-size: 18px; font-weight: 700; color: #89b4fa;">\${wr.tokensCount.toLocaleString()}</div>
            </div>
            <div class="card" style="padding: 10px;">
              <div class="card-label">Quality Score</div>
              <div style="font-size: 18px; font-weight: 700; color: #a6e3a1;">\${wr.avgPromptScore}/100</div>
            </div>
            <div class="card" style="padding: 10px;">
              <div class="card-label">Sessions</div>
              <div style="font-size: 18px; font-weight: 700; color: #cba6f7;">\${wr.sessionsCount}</div>
            </div>
          </div>
          <p><strong>Primary Model:</strong> \${wr.mostUsedModel} | <strong>Most Common Task:</strong> \${wr.mostCommonTask}</p>
          \${expensiveHtml}
          \${diagHtml}
          <h4 style="margin-top: 16px; color: #fff;">🎯 Data-Driven Coaching Recommendations:</h4>
          <ul style="padding-left: 20px; margin-top: 6px; line-height: 1.8;">
            \${wr.improvementAreas.map(i => \`<li>\${i}</li>\`).join('')}
          </ul>
        \`;
      }
    }

    function renderPromptAnalysis(analysis) {
      if (!analysis) return;
      const res = document.getElementById('coach-result');
      res.style.display = 'block';

      const scoreEl = document.getElementById('coach-score-text');
      scoreEl.textContent = 'Score: ' + analysis.score + '/100';
      scoreEl.style.color = analysis.score >= 80 ? '#a6e3a1' : analysis.score >= 50 ? '#f9e2af' : '#f38ba8';

      document.getElementById('coach-category-badge').textContent = 'Category: ' + analysis.category;

      const dims = analysis.dimensionScores || {};
      document.getElementById('coach-dimensions').innerHTML = \`
        <strong>Dimension Breakdown:</strong>
        Clarity: \${dims.clarity}/20 | Context: \${dims.context}/15 | Requirements: \${dims.requirements}/15 |
        Constraints: \${dims.constraints}/15 | Expected Output: \${dims.expectedOutput}/15 | Acceptance Criteria: \${dims.acceptanceCriteria}/10 | Scope: \${dims.scope}/10
      \`;

      const missingEl = document.getElementById('coach-missing');
      missingEl.innerHTML = analysis.missingItems.length > 0
        ? '<strong>Missing:</strong> ' + analysis.missingItems.join(', ')
        : '<strong>Missing:</strong> None (Well specified)';

      const strengthsEl = document.getElementById('coach-strengths');
      strengthsEl.innerHTML = analysis.strengths.length > 0
        ? '<strong>Strengths:</strong> ' + analysis.strengths.join(', ')
        : '';
    }

    // Signal ready to extension
    vscode.postMessage({ command: 'ready' });
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    DashboardPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}
