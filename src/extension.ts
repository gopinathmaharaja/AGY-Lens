import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { AntigravityCollector } from './collectors/antigravityCollector';
import { TranscriptCollector } from './collectors/transcriptCollector';
import { AppDatabase } from './database/database';
import { SessionRepository } from './database/repositories/sessionRepository';
import { PromptRepository } from './database/repositories/promptRepository';
import { UsageRepository } from './database/repositories/usageRepository';
import { QuotaRepository } from './database/repositories/quotaRepository';
import { InsightRepository } from './database/repositories/insightRepository';
import { SyncService } from './services/syncService';
import { ExportService } from './services/exportService';
import { StatusBarManager } from './ui/statusBar';
import { DashboardPanel } from './webview/dashboardPanel';
import { analyzePromptCommand } from './commands/analyzePrompt';
import { improvePromptCommand } from './commands/improvePrompt';
import { exportDataCommand, importDataCommand } from './commands/exportData';
import {
  openSettingsCommand,
  openLogsCommand,
  resetLocalDataCommand,
  showTodayUsageCommand,
  showModelUsageCommand
} from './commands/miscCommands';

let syncService: SyncService | undefined;
let statusBar: StatusBarManager | undefined;
let appDb: AppDatabase | undefined;

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Antigravity Usage Intelligence');
  outputChannel.appendLine('[INFO] Activating Antigravity Usage Intelligence Extension...');

  // Initialize Collectors
  const antigravityCollector = new AntigravityCollector();
  const transcriptCollector = new TranscriptCollector();

  // Storage directory for SQLite
  const storageDir = context.globalStorageUri
    ? context.globalStorageUri.fsPath
    : path.join(os.homedir(), '.gemini', 'antigravity-cli');

  try {
    appDb = new AppDatabase(storageDir, 'antigravity_analytics.db');
    outputChannel.appendLine(`[INFO] Database initialized at: ${appDb.getDbPath()}`);
  } catch (err: any) {
    outputChannel.appendLine(`[ERROR] Database initialization failed: ${err.message}`);
    vscode.window.showErrorMessage(`Antigravity Usage Intelligence: Database error - ${err.message}`);
    return;
  }

  // Initialize Repositories
  const sessionRepo = new SessionRepository(appDb);
  const promptRepo = new PromptRepository(appDb);
  const usageRepo = new UsageRepository(appDb);
  const quotaRepo = new QuotaRepository(appDb);
  const insightRepo = new InsightRepository(appDb);

  // Initialize Services & UI
  statusBar = new StatusBarManager();
  const exportService = new ExportService(sessionRepo, promptRepo, usageRepo);

  syncService = new SyncService(
    antigravityCollector,
    transcriptCollector,
    sessionRepo,
    promptRepo,
    usageRepo,
    quotaRepo,
    insightRepo,
    outputChannel
  );

  syncService.onSnapshotUpdated((snapshot) => {
    statusBar?.update(snapshot);
  });

  // Register Commands
  context.subscriptions.push(
    statusBar,
    outputChannel,
    vscode.commands.registerCommand('antigravity.openDashboard', () => {
      DashboardPanel.createOrShow(
        context.extensionUri,
        syncService!,
        usageRepo,
        promptRepo,
        sessionRepo,
        quotaRepo,
        antigravityCollector
      );
    }),
    vscode.commands.registerCommand('antigravity.refresh', async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Refreshing Antigravity usage metrics...'
        },
        async () => {
          const snapshot = await syncService!.sync();
          statusBar?.update(snapshot);
        }
      );
    }),
    vscode.commands.registerCommand('antigravity.analyzePrompt', () => {
      analyzePromptCommand();
    }),
    vscode.commands.registerCommand('antigravity.improvePrompt', (text?: string) => {
      improvePromptCommand(text);
    }),
    vscode.commands.registerCommand('antigravity.exportData', () => {
      exportDataCommand(exportService);
    }),
    vscode.commands.registerCommand('antigravity.importData', () => {
      importDataCommand(exportService);
    }),
    vscode.commands.registerCommand('antigravity.openSettings', () => {
      openSettingsCommand();
    }),
    vscode.commands.registerCommand('antigravity.openLogs', () => {
      openLogsCommand(outputChannel);
    }),
    vscode.commands.registerCommand('antigravity.resetLocalData', () => {
      resetLocalDataCommand(appDb!, () => {
        syncService!.sync();
      });
    }),
    vscode.commands.registerCommand('antigravity.showTodayUsage', () => {
      showTodayUsageCommand(usageRepo);
    }),
    vscode.commands.registerCommand('antigravity.showModelUsage', () => {
      showModelUsageCommand(usageRepo);
    })
  );

  // Start background monitoring
  syncService.start();
  outputChannel.appendLine('[INFO] Antigravity Usage Intelligence Extension active.');
}

export function deactivate() {
  if (syncService) {
    syncService.stop();
  }
  if (appDb) {
    appDb.close();
  }
}
