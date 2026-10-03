import { AntigravityUsageSnapshot, AntigravityUsageSnapshotSchema } from '../types/usage';
import { ModelParser } from './modelParser';

export class StatusParser {
  public static parseCountdown(text: string): { hours: number; minutes: number } | null {
    if (!text) return null;
    const match = text.match(/(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?/i);
    if (!match || (!match[1] && !match[2])) return null;

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    return { hours, minutes };
  }

  public static formatCountdown(resetTimeIso?: string | null): string {
    if (!resetTimeIso) return 'N/A';
    const target = new Date(resetTimeIso).getTime();
    const now = Date.now();
    const diffMs = target - now;
    if (diffMs <= 0) return 'Reset ready';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  }

  public static normalizeSnapshot(raw: Partial<AntigravityUsageSnapshot>): AntigravityUsageSnapshot {
    const model = ModelParser.normalizeModelName(raw.model);
    const contextWindow = raw.contextWindow || ModelParser.getContextWindow(model);
    const contextTokens = raw.contextTokens || 0;
    const contextPercentage =
      contextWindow > 0 ? Math.min(100, Math.round((contextTokens / contextWindow) * 100)) : 0;

    const snapshot = {
      timestamp: raw.timestamp || new Date().toISOString(),
      model,
      conversationId: raw.conversationId || '',
      transcriptPath: raw.transcriptPath || '',
      inputTokens: raw.inputTokens || 0,
      outputTokens: raw.outputTokens || 0,
      cacheReadTokens: raw.cacheReadTokens || 0,
      contextTokens,
      contextWindow,
      contextPercentage,
      quotaRemaining: typeof raw.quotaRemaining === 'number' ? raw.quotaRemaining : null,
      quotaResetTime: raw.quotaResetTime || null,
      workspace: raw.workspace || '',
      planTier: raw.planTier || 'Antigravity Pro',
      agentState: raw.agentState || 'IDLE',
      isEstimate: raw.isEstimate ?? false,
      todayTokens: raw.todayTokens || 0,
      todayPrompts: raw.todayPrompts || 0,
      weekTokens: raw.weekTokens || 0,
      weekPrompts: raw.weekPrompts || 0,
      turnCount: raw.turnCount || 0
    };

    return AntigravityUsageSnapshotSchema.parse(snapshot);
  }
}
