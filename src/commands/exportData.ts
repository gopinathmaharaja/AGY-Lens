import * as vscode from 'vscode';
import { ExportService } from '../services/exportService';

export async function exportDataCommand(exportService: ExportService): Promise<void> {
  const format = await vscode.window.showQuickPick(
    [
      { label: 'JSON', description: 'Complete structured dump of sessions, prompts, and token usage' },
      { label: 'CSV', description: 'Daily token metrics suitable for spreadsheets' },
      { label: 'Markdown', description: 'Formatted summary report' }
    ],
    { placeHolder: 'Select export format' }
  );

  if (!format) return;

  const ext = format.label.toLowerCase() === 'markdown' ? 'md' : format.label.toLowerCase();
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`antigravity_usage_export.${ext}`),
    filters: { [format.label]: [ext] }
  });

  if (!uri) return;

  try {
    if (format.label === 'JSON') {
      await exportService.exportToJson(uri.fsPath, { includePrompts: true, redactSecrets: true });
    } else if (format.label === 'CSV') {
      await exportService.exportToCsv(uri.fsPath);
    } else {
      await exportService.exportToMarkdown(uri.fsPath);
    }
    vscode.window.showInformationMessage(`Antigravity usage data exported successfully to ${uri.fsPath}`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Export failed: ${err.message}`);
  }
}

export async function importDataCommand(exportService: ExportService): Promise<void> {
  const uri = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { JSON: ['json'] }
  });

  if (!uri || uri.length === 0) return;

  try {
    const res = await exportService.importFromJson(uri[0].fsPath);
    vscode.window.showInformationMessage(
      `Import complete: ${res.sessionsImported} sessions and ${res.promptsImported} prompts imported.`
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(`Import failed: ${err.message}`);
  }
}
