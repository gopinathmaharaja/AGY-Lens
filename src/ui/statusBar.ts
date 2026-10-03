import * as vscode from 'vscode';
import { AntigravityUsageSnapshot } from '../types/usage';
import { StatusParser } from '../parsers/statusParser';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'antigravity.openDashboard';
    this.renderDefault();
    this.statusBarItem.show();
  }

  private renderDefault(): void {
    this.statusBarItem.text = '$(pulse) AG: Initializing...';
    this.statusBarItem.tooltip = 'Antigravity Usage Intelligence: Connecting to local runtime...';
  }

  public update(snapshot?: AntigravityUsageSnapshot): void {
    if (!snapshot) {
      this.statusBarItem.text = '$(cloud-offline) AG: N/A';
      this.statusBarItem.tooltip = 'Antigravity runtime not detected';
      return;
    }

    const shortModel = snapshot.model?.replace(/ \(.*?\)/, '') || 'Gemini';

    // State icon
    let icon = '$(hubot)';
    if (snapshot.agentState === 'RUNNING') {
      icon = '$(sync~spin)';
    } else if (snapshot.agentState === 'ERROR') {
      icon = '$(error)';
    }

    const todayTokensK = Math.round((snapshot.todayTokens || 0) / 1000);
    this.statusBarItem.text = `${icon} AG: ${shortModel} | ${todayTokensK}k`;

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.appendMarkdown(`### Antigravity Usage Intelligence\n\n`);
    md.appendMarkdown(`- **Model:** ${snapshot.model || 'N/A'}\n`);
    md.appendMarkdown(`- **State:** ${snapshot.agentState || 'IDLE'}\n`);
    md.appendMarkdown(`- **Today:** ${(snapshot.todayTokens || 0).toLocaleString()} tokens (${snapshot.todayPrompts || 0} prompts)\n`);
    md.appendMarkdown(`- **This Week:** ${(snapshot.weekTokens || 0).toLocaleString()} tokens (${snapshot.weekPrompts || 0} prompts)\n`);
    if (snapshot.conversationId) {
      md.appendMarkdown(`- **Active Conversation:** \`${snapshot.conversationId.slice(0, 8)}...\` (${snapshot.turnCount || 0} turns)\n`);
    }
    md.appendMarkdown(`- **Quota:** *Unavailable* (Antigravity does not expose quota locally)\n`);
    md.appendMarkdown(
      `- **Context Usage:** ${snapshot.contextPercentage}% (${(
        (snapshot.contextTokens || 0) / 1000
      ).toFixed(1)}k / ${(snapshot.contextWindow / 1000).toFixed(0)}k)\n\n`
    );
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`[$(dashboard) Open Dashboard](command:antigravity.openDashboard) | [$(refresh) Refresh](command:antigravity.refresh)\n`);

    this.statusBarItem.tooltip = md;
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
