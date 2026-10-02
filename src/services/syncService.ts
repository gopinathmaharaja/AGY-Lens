import * as vscode from 'vscode';
import { AntigravityCollector } from '../collectors/antigravityCollector';
import { TranscriptCollector } from '../collectors/transcriptCollector';
import { QuotaCollector } from '../collectors/quotaCollector';
import { StatusParser } from '../parsers/statusParser';
import { PromptAnalyzer } from '../analytics/promptAnalyzer';
import { SessionRepository } from '../database/repositories/sessionRepository';
import { PromptRepository } from '../database/repositories/promptRepository';
import { UsageRepository } from '../database/repositories/usageRepository';
import { QuotaRepository } from '../database/repositories/quotaRepository';
import { InsightRepository } from '../database/repositories/insightRepository';
import { SettingsService } from './settingsService';
import { AntigravityUsageSnapshot } from '../types/usage';

export class SyncService {
  private timer?: NodeJS.Timeout;
  private isSyncing = false;
  private lastSnapshot?: AntigravityUsageSnapshot;
  private onSnapshotUpdatedEmitter = new vscode.EventEmitter<AntigravityUsageSnapshot>();
  public readonly onSnapshotUpdated = this.onSnapshotUpdatedEmitter.event;

  constructor(
    private antigravityCollector: AntigravityCollector,
    private transcriptCollector: TranscriptCollector,
    private sessionRepo: SessionRepository,
    private promptRepo: PromptRepository,
    private usageRepo: UsageRepository,
    private quotaRepo: QuotaRepository,
    private insightRepo: InsightRepository,
    private outputChannel: vscode.OutputChannel
  ) {}

  public start(): void {
    const settings = SettingsService.getSettings();
    if (!settings.enabled) return;

    // Run first sync immediately
    this.sync().catch((err) => {
      this.outputChannel.appendLine(`[WARN] Initial sync error: ${err.message}`);
    });

    const intervalMs = Math.max(5, settings.refreshInterval) * 1000;
    this.timer = setInterval(() => {
      this.sync().catch((err) => {
        this.outputChannel.appendLine(`[WARN] Periodic sync error: ${err.message}`);
      });
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public async sync(): Promise<AntigravityUsageSnapshot> {
    if (this.isSyncing) {
      return this.lastSnapshot || this.getFallbackSnapshot();
    }

    this.isSyncing = true;
    try {
      const activeConvId = this.antigravityCollector.getActiveConversationId();
      let model = 'Gemini 3.8 Flash (High)';
      let inputTokens = 0;
      let outputTokens = 0;
      let contextTokens = 0;
      let contextWindow = 1000000;
      let agentState = 'IDLE';
      let transcriptPath: string | undefined;

      if (activeConvId) {
        transcriptPath = this.antigravityCollector.getTranscriptPath(activeConvId);
        if (transcriptPath) {
          const parsed = await this.transcriptCollector.collect(transcriptPath, activeConvId);
          if (parsed) {
            model = parsed.currentModel || model;
            inputTokens = parsed.inputTokens;
            outputTokens = parsed.outputTokens;
            contextTokens = parsed.totalEstimatedTokens;
            agentState = parsed.agentState;

            // Upsert session
            this.sessionRepo.upsert({
              conversation_id: activeConvId,
              workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
              model,
              started_at: parsed.startedAt,
              ended_at: parsed.lastActiveAt,
              agent_state: agentState,
              step_count: parsed.steps.length
            });

            // Store new prompts if enabled
            const settings = SettingsService.getSettings();
            if (settings.privacy.storePrompts) {
              const existingPromptCount = this.promptRepo.count();
              if (parsed.userPrompts.length > existingPromptCount) {
                const newPrompts = parsed.userPrompts.slice(existingPromptCount);
                for (const up of newPrompts) {
                  const analysis = PromptAnalyzer.analyze(up.prompt);
                  this.promptRepo.insert({
                    session_id: activeConvId,
                    prompt: settings.privacy.secretRedaction ? analysis.redactedPrompt : up.prompt,
                    timestamp: up.timestamp,
                    category: analysis.category,
                    prompt_score: analysis.score,
                    clarity_score: analysis.dimensionScores.clarity,
                    context_score: analysis.dimensionScores.context,
                    missing_items: analysis.missingItems.join(', ')
                  });
                }
              }
            }

            // Insert usage record
            this.usageRepo.insert({
              session_id: activeConvId,
              timestamp: new Date().toISOString(),
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cache_read_tokens: 0,
              context_tokens: contextTokens,
              context_window: contextWindow,
              model
            });
          }
        }
      }

      // Quota collection
      const quotaSnapshot = QuotaCollector.collect(model);
      this.quotaRepo.recordQuota({
        model,
        remaining: quotaSnapshot.remainingPercentage || 85,
        reset_time: quotaSnapshot.resetTimeIso || new Date().toISOString(),
        timestamp: quotaSnapshot.timestamp,
        is_estimate: quotaSnapshot.isEstimate ? 1 : 0
      });

      const snapshot = StatusParser.normalizeSnapshot({
        timestamp: new Date().toISOString(),
        model,
        conversationId: activeConvId,
        transcriptPath,
        inputTokens,
        outputTokens,
        contextTokens,
        contextWindow,
        quotaRemaining: quotaSnapshot.remainingPercentage,
        quotaResetTime: quotaSnapshot.resetTimeIso,
        agentState,
        workspace: vscode.workspace.name || ''
      });

      this.lastSnapshot = snapshot;
      this.onSnapshotUpdatedEmitter.fire(snapshot);

      // Check thresholds for notifications
      this.checkThresholds(snapshot);

      return snapshot;
    } finally {
      this.isSyncing = false;
    }
  }

  private checkThresholds(snapshot: AntigravityUsageSnapshot): void {
    const settings = SettingsService.getSettings();
    if (!settings.ui.notifications) return;

    if (snapshot.contextPercentage >= settings.ui.contextCriticalThreshold) {
      vscode.window.showErrorMessage(
        `Critical: Antigravity context usage is at ${snapshot.contextPercentage}% (${Math.round(
          snapshot.contextTokens / 1000
        )}k / ${Math.round(snapshot.contextWindow / 1000)}k tokens). Start a new session to avoid degradation.`
      );
    } else if (snapshot.contextPercentage >= settings.ui.contextWarningThreshold) {
      vscode.window.showWarningMessage(
        `Warning: Antigravity context usage is at ${snapshot.contextPercentage}%. Consider summarizing and resetting the conversation.`
      );
    }
  }

  private getFallbackSnapshot(): AntigravityUsageSnapshot {
    return StatusParser.normalizeSnapshot({
      timestamp: new Date().toISOString(),
      model: 'Gemini 3.8 Flash (High)',
      quotaRemaining: 85,
      agentState: 'IDLE'
    });
  }

  public getLastSnapshot(): AntigravityUsageSnapshot | undefined {
    return this.lastSnapshot;
  }
}
