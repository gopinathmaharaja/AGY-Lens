import { ConversationAnalysis } from '../types/usage';

export interface ConversationTurn {
  stepIndex: number;
  type: string;
  source: string;
  content: string;
  timestamp: string;
}

export class ConversationAnalyzer {
  public static analyze(
    conversationId: string,
    turns: ConversationTurn[],
    contextTokens: number = 0,
    contextLimit: number = 1000000
  ): ConversationAnalysis {
    const userPrompts = turns
      .filter((t) => t.source === 'USER_EXPLICIT' || t.type === 'USER_INPUT')
      .map((t) => t.content);

    let repeatedPromptsCount = 0;
    const seenPrompts = new Map<string, number>();

    for (const prompt of userPrompts) {
      const normalized = prompt.trim().toLowerCase().slice(0, 120);
      if (!normalized) continue;
      const count = (seenPrompts.get(normalized) || 0) + 1;
      seenPrompts.set(normalized, count);
      if (count > 1) {
        repeatedPromptsCount++;
      }
    }

    // Repeated correction phrases
    const correctionPhrases = /\b(no that'?s wrong|not what i asked|try again|still not working|i told you|again|fix it again|re-read)\b/i;
    const repeatedCorrectionsCount = userPrompts.filter((p) => correctionPhrases.test(p)).length;

    const contextUsagePercent = Math.min(100, Math.round((contextTokens / (contextLimit || 1000000)) * 100));
    const isContextApproachingLimit = contextUsagePercent >= 80;

    const warnings: string[] = [];

    if (repeatedPromptsCount > 0) {
      warnings.push(`${repeatedPromptsCount} prompt(s) were submitted more than once.`);
    }

    if (repeatedCorrectionsCount >= 2) {
      warnings.push(`Detected ${repeatedCorrectionsCount} repetitive correction attempts in this conversation.`);
    }

    if (userPrompts.length > 25) {
      warnings.push(`High conversation turn count (${userPrompts.length} user prompts). Accumulated context may degrade reasoning accuracy.`);
    }

    if (isContextApproachingLimit) {
      warnings.push(`Context window is at ${contextUsagePercent}% of limit.`);
    }

    // Calculate efficiency score (starts at 100, deducted by inefficiencies)
    let efficiency = 100;
    efficiency -= repeatedPromptsCount * 8;
    efficiency -= repeatedCorrectionsCount * 10;
    if (userPrompts.length > 20) efficiency -= (userPrompts.length - 20) * 1.5;
    if (contextUsagePercent > 80) efficiency -= (contextUsagePercent - 80) * 1.2;
    efficiency = Math.max(10, Math.min(100, Math.round(efficiency)));

    let suggestedAction: string | undefined;
    if (efficiency < 70 || isContextApproachingLimit || repeatedCorrectionsCount >= 2) {
      suggestedAction =
        'Consider starting a fresh conversation with a concise summary of current accomplishments and remaining requirements.';
    }

    return {
      conversationId,
      efficiencyScore: efficiency,
      turnCount: userPrompts.length,
      repeatedPromptsCount,
      repeatedCorrectionsCount,
      contextUsagePercent,
      isContextApproachingLimit,
      warnings,
      suggestedAction
    };
  }
}
