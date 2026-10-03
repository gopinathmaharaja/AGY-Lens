import * as vscode from 'vscode';
import { UsageRepository } from '../database/repositories/usageRepository';
import { AppDatabase } from '../database/database';
import { SCHEMA_SQL } from '../database/schema';

export async function openSettingsCommand(): Promise<void> {
  vscode.commands.executeCommand('workbench.action.openSettings', 'antigravity');
}

export function openLogsCommand(outputChannel: vscode.OutputChannel): void {
  outputChannel.show(true);
}

export async function resetLocalDataCommand(db: AppDatabase, refreshCallback: () => void): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    'Are you sure you want to reset all local Antigravity usage and prompt history?',
    { modal: true },
    'Reset All Data'
  );

  if (confirm === 'Reset All Data') {
    db.exec(`
      DELETE FROM sessions;
      DELETE FROM prompts;
      DELETE FROM quota;
      DELETE FROM recommendations;
      DELETE FROM insights;
    `);
    try { db.exec('DELETE FROM usage_snapshots;'); } catch {}
    try { db.exec('DELETE FROM usage;'); } catch {}
    vscode.window.showInformationMessage('Local Antigravity analytics data has been cleared.');
    refreshCallback();
  }
}

export function showTodayUsageCommand(usageRepo: UsageRepository): void {
  const today = usageRepo.getTodaySummary();
  vscode.window.showInformationMessage(
    `Today's Antigravity Usage: ${today.requests} requests | ${today.tokens.toLocaleString()} tokens | Avg Context: ${today.avgContext}%`
  );
}

export function showModelUsageCommand(usageRepo: UsageRepository): void {
  const models = usageRepo.getModelUsage();
  if (models.length === 0) {
    vscode.window.showInformationMessage('No model usage data recorded yet.');
    return;
  }
  const summary = models.map((m) => `${m.model}: ${m.requestCount} reqs (${m.percentage}%)`).join(' | ');
  vscode.window.showInformationMessage(`Model Distribution: ${summary}`);
}
