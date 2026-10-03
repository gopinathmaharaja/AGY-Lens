import * as vscode from 'vscode';
import { AntigravityCollector } from '../collectors/antigravityCollector';
import { TranscriptCollector } from '../collectors/transcriptCollector';
import { QuotaCollector } from '../collectors/quotaCollector';
import { HistoryCollector } from '../collectors/historyCollector';
import { StatusParser } from '../parsers/statusParser';
import { PromptAnalyzer } from '../analytics/promptAnalyzer';
import { SessionRepository } from '../database/repositories/sessionRepository';
import { PromptRepository } from '../database/repositories/promptRepository';
import { UsageRepository } from '../database/repositories/usageRepository';
import { QuotaRepository } from '../database/repositories/quotaRepository';
import { InsightRepository } from '../database/repositories/insightRepository';
import { SettingsService } from './settingsService';
import { AntigravityUsageSnapshot, ConversationRef, AntigravitySource } from '../types/usage';

export class SyncService {
  private timer?: NodeJS.Timeout;
  private isSyncing = false;
  private hasPerformedInitialFullScan = false;
  private historyCollector: HistoryCollector;
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
  ) {
    this.historyCollector = new HistoryCollector();
  }

  public start(): void {
    const settings = SettingsService.getSettings();
    if (!settings.enabled) return;

    // Run first sync immediately (including full scan on startup)
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

  /**
   * Syncs active conversation and triggers initial full scan if needed.
   */
  public async sync(): Promise<AntigravityUsageSnapshot> {
    if (this.isSyncing) {
      return this.lastSnapshot || this.getFallbackSnapshot();
    }

    this.isSyncing = true;
    try {
      // First-time startup: scan all conversations across CLI, App, and IDE
      if (!this.hasPerformedInitialFullScan) {
        try {
          await this.scanAllHistory();
          this.hasPerformedInitialFullScan = true;
        } catch (scanErr: any) {
          this.outputChannel.appendLine(`[WARN] Full history scan error: ${scanErr.message}`);
        }
      }

      const activeConvId = this.antigravityCollector.getActiveConversationId();
      let model = this.antigravityCollector.getCurrentModel();
      let inputTokens = 0;
      let outputTokens = 0;
      let contextTokens = 0;
      let contextWindow = 1000000;
      let agentState = 'IDLE';
      let transcriptPath: string | undefined;

      if (activeConvId) {
        transcriptPath = this.antigravityCollector.getTranscriptPath(activeConvId);
        const source = this.antigravityCollector.getSourceForConversation(activeConvId);

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
              source,
              workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
              model,
              started_at: parsed.startedAt,
              ended_at: parsed.lastActiveAt,
              agent_state: agentState,
              step_count: parsed.steps.length,
              user_prompt_count: parsed.userPrompts.length,
              total_estimated_input_tokens: inputTokens,
              total_estimated_output_tokens: outputTokens
            });

            // Store new prompts per-conversation with deduplication
            const settings = SettingsService.getSettings();
            if (settings.privacy.storePrompts) {
              this.ingestUserPrompts(activeConvId, source, parsed.userPrompts, settings);
            }

            // Upsert usage snapshot for active session (no duplicate insertion)
            this.usageRepo.upsertSnapshot({
              session_id: activeConvId,
              source,
              snapshot_at: new Date().toISOString(),
              cumulative_input_tokens: inputTokens,
              cumulative_output_tokens: outputTokens,
              step_count: parsed.steps.length,
              model
            });
          }
        }
      }

      // Quota collection — honest null values, no fake 85%
      const quotaSnapshot = QuotaCollector.collect(model);
      this.quotaRepo.recordQuota({
        model,
        remaining: quotaSnapshot.remainingPercentage ?? (null as any),
        reset_time: quotaSnapshot.resetTimeIso ?? (null as any),
        timestamp: quotaSnapshot.timestamp,
        source: 'observed'
      });

      const todaySummary = this.usageRepo.getTodaySummary();
      const weekSummary = this.usageRepo.getWeekSummary();
      let activeTurnCount = 0;
      if (activeConvId) {
        const existingSession = this.sessionRepo.getByConversationId(activeConvId);
        if (existingSession) {
          activeTurnCount = existingSession.step_count || 0;
        }
      }

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
        workspace: vscode.workspace.name || '',
        isEstimate: false,
        todayTokens: todaySummary.tokens,
        todayPrompts: todaySummary.requests,
        weekTokens: weekSummary.tokens,
        weekPrompts: weekSummary.requests,
        turnCount: activeTurnCount
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

  /**
   * Scans all conversations across CLI, App, and IDE directories, plus history.jsonl.
   */
  public async scanAllHistory(): Promise<{ conversations: number; prompts: number }> {
    this.outputChannel.appendLine('[INFO] Starting scan of all Antigravity conversations...');
    const conversations = this.antigravityCollector.getAllConversations();
    const settings = SettingsService.getSettings();
    let convCount = 0;
    let promptCount = 0;

    for (const conv of conversations) {
      try {
        const transcriptPath = this.antigravityCollector.getTranscriptPath(conv.id);
        if (!transcriptPath) continue;

        const parsed = await this.transcriptCollector.collect(transcriptPath, conv.id);
        if (!parsed) continue;

        // Checkpoint optimization: If session has not changed since last scan, skip prompt re-analysis
        const existingSession = this.sessionRepo.getByConversationId(conv.id);
        if (existingSession && existingSession.step_count === parsed.steps.length && existingSession.step_count > 0) {
          convCount++;
          continue;
        }

        const convModel = parsed.currentModel || 'Gemini 3.8 Flash (High)';

        this.sessionRepo.upsert({
          conversation_id: conv.id,
          source: conv.source,
          workspace: '',
          model: convModel,
          started_at: parsed.startedAt,
          ended_at: parsed.lastActiveAt,
          agent_state: parsed.agentState,
          step_count: parsed.steps.length,
          user_prompt_count: parsed.userPrompts.length,
          total_estimated_input_tokens: parsed.inputTokens,
          total_estimated_output_tokens: parsed.outputTokens,
          last_synced_step: parsed.steps.length
        });

        if (settings.privacy.storePrompts) {
          const inserted = this.ingestUserPrompts(conv.id, conv.source, parsed.userPrompts, settings);
          promptCount += inserted;
        }

        this.usageRepo.upsertSnapshot({
          session_id: conv.id,
          source: conv.source,
          snapshot_at: parsed.lastActiveAt,
          cumulative_input_tokens: parsed.inputTokens,
          cumulative_output_tokens: parsed.outputTokens,
          step_count: parsed.steps.length,
          model: convModel
        });

        convCount++;
      } catch (err: any) {
        this.outputChannel.appendLine(`[WARN] Error scanning conversation ${conv.id}: ${err.message}`);
      }
    }

    // Ingest CLI prompts from history.jsonl if available
    try {
      const historyEntries = this.historyCollector.getPromptEntries();
      for (let i = 0; i < historyEntries.length; i++) {
        const entry = historyEntries[i];
        const convId = entry.conversationId || `cli-history-${entry.timestamp}`;
        if (!this.promptRepo.exists(convId, i)) {
          const analysis = PromptAnalyzer.analyze(entry.display);
          const inputTokens = Math.max(1, Math.round(entry.display.length / 3.8));
          this.promptRepo.insert({
            session_id: convId,
            source: 'cli',
            step_index: i,
            prompt: settings.privacy.secretRedaction ? analysis.redactedPrompt : entry.display,
            timestamp: new Date(entry.timestamp).toISOString(),
            category: analysis.category,
            prompt_score: analysis.score,
            clarity_score: analysis.dimensionScores.clarity,
            context_score: analysis.dimensionScores.context,
            requirements_score: analysis.dimensionScores.requirements,
            constraints_score: analysis.dimensionScores.constraints,
            expected_output_score: analysis.dimensionScores.expectedOutput,
            acceptance_criteria_score: analysis.dimensionScores.acceptanceCriteria,
            scope_score: analysis.dimensionScores.scope,
            missing_items: analysis.missingItems.join(', '),
            estimated_input_tokens: inputTokens,
            estimated_output_tokens: 0,
            word_count: entry.display.split(/\s+/).filter(Boolean).length
          });
          promptCount++;
        }
      }
    } catch (hErr: any) {
      this.outputChannel.appendLine(`[WARN] Error reading history.jsonl: ${hErr.message}`);
    }

    this.outputChannel.appendLine(`[INFO] Scan complete: ${convCount} conversations and ${promptCount} prompts indexed.`);
    return { conversations: convCount, prompts: promptCount };
  }

  private ingestUserPrompts(
    sessionId: string,
    source: AntigravitySource,
    userPrompts: { prompt: string; timestamp: string; stepIndex: number; inputTokens?: number; outputTokens?: number; wordCount?: number }[],
    settings: any
  ): number {
    let inserted = 0;
    for (const up of userPrompts) {
      if (this.promptRepo.exists(sessionId, up.stepIndex)) {
        continue;
      }

      const analysis = PromptAnalyzer.analyze(up.prompt);
      const inputTokens = up.inputTokens || Math.max(1, Math.round(up.prompt.length / 3.8));
      const outputTokens = up.outputTokens || 0;
      const words = up.wordCount || up.prompt.split(/\s+/).filter(Boolean).length;

      this.promptRepo.insert({
        session_id: sessionId,
        source,
        step_index: up.stepIndex,
        prompt: settings.privacy.secretRedaction ? analysis.redactedPrompt : up.prompt,
        timestamp: up.timestamp,
        category: analysis.category,
        prompt_score: analysis.score,
        clarity_score: analysis.dimensionScores.clarity,
        context_score: analysis.dimensionScores.context,
        requirements_score: analysis.dimensionScores.requirements,
        constraints_score: analysis.dimensionScores.constraints,
        expected_output_score: analysis.dimensionScores.expectedOutput,
        acceptance_criteria_score: analysis.dimensionScores.acceptanceCriteria,
        scope_score: analysis.dimensionScores.scope,
        missing_items: analysis.missingItems.join(', '),
        estimated_input_tokens: inputTokens,
        estimated_output_tokens: outputTokens,
        word_count: words
      });
      inserted++;
    }
    return inserted;
  }

  private notifiedLongSessions = new Set<string>();
  private notifiedMilestones = new Set<number>();
  private lastQualityAlertTime = 0;

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

    // Long conversation warning (>25 turns)
    if (snapshot.conversationId && (snapshot.turnCount || 0) > 25 && !this.notifiedLongSessions.has(snapshot.conversationId)) {
      this.notifiedLongSessions.add(snapshot.conversationId);
      vscode.window.showWarningMessage(
        `Active conversation has reached ${snapshot.turnCount} turns. Starting a new session prevents context drift and high token consumption.`
      );
    }

    // Daily token milestone notifications (e.g. 50k, 100k, 250k)
    const todayTokens = snapshot.todayTokens || 0;
    const milestones = [50000, 100000, 250000, 500000];
    for (const m of milestones) {
      if (todayTokens >= m && !this.notifiedMilestones.has(m)) {
        this.notifiedMilestones.add(m);
        vscode.window.showInformationMessage(
          `You've used ${Math.round(todayTokens / 1000)}k tokens today across ${snapshot.todayPrompts || 0} prompts.`
        );
        break;
      }
    }

    // Low prompt quality trend alert (last 5 prompts scored < 40)
    const now = Date.now();
    if (now - this.lastQualityAlertTime > 3600000) {
      const recentPrompts = this.promptRepo.getRecent(5);
      if (recentPrompts.length === 5 && recentPrompts.every(p => p.prompt_score < 40)) {
        this.lastQualityAlertTime = now;
        vscode.window.showWarningMessage(
          'Prompt quality trend: Your last 5 prompts scored below 40/100. Adding technical file context and explicit expected outputs significantly improves model responses.'
        );
      }
    }
  }

  private getFallbackSnapshot(): AntigravityUsageSnapshot {
    const todaySummary = this.usageRepo.getTodaySummary();
    const weekSummary = this.usageRepo.getWeekSummary();
    return StatusParser.normalizeSnapshot({
      timestamp: new Date().toISOString(),
      model: this.antigravityCollector.getCurrentModel(),
      quotaRemaining: null,
      agentState: 'IDLE',
      isEstimate: false,
      todayTokens: todaySummary.tokens,
      todayPrompts: todaySummary.requests,
      weekTokens: weekSummary.tokens,
      weekPrompts: weekSummary.requests,
      turnCount: 0
    });
  }

  public getLastSnapshot(): AntigravityUsageSnapshot | undefined {
    return this.lastSnapshot;
  }
}
