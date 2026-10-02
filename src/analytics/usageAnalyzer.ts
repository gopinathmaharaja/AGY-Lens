import {
  PromptRecord,
  SessionRecord,
  UsageRecord,
  PersonalProfileSummary
} from '../types/usage';

export interface WeeklyReport {
  sessionsCount: number;
  promptsCount: number;
  tokensCount: number;
  avgPromptScore: number;
  mostUsedModel: string;
  mostCommonTask: string;
  avgContextPercentage: number;
  improvementAreas: string[];
}

export class UsageAnalyzer {
  public static generateProfile(
    prompts: PromptRecord[],
    sessions: SessionRecord[],
    usages: UsageRecord[]
  ): PersonalProfileSummary {
    if (prompts.length === 0) {
      return {
        strengths: ['Started using Antigravity AI assistant'],
        improvementAreas: ['Include specific technical context and acceptance criteria in your prompts'],
        topCategories: [],
        avgPromptLength: 0,
        avgPromptScore: 0,
        totalPrompts: 0,
        totalSessions: sessions.length,
        totalTokens: 0
      };
    }

    const totalScore = prompts.reduce((sum, p) => sum + p.prompt_score, 0);
    const avgPromptScore = Math.round(totalScore / prompts.length);

    const totalChars = prompts.reduce((sum, p) => sum + p.prompt.length, 0);
    const avgPromptLength = Math.round(totalChars / prompts.length);

    const totalTokens = usages.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0);

    // Count categories
    const catMap = new Map<string, number>();
    for (const p of prompts) {
      catMap.set(p.category, (catMap.get(p.category) || 0) + 1);
    }
    const topCategories = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Analyze common strengths & improvement areas
    const strengths: string[] = [];
    const improvementAreas: string[] = [];

    const avgClarity = prompts.reduce((s, p) => s + (p.clarity_score || 10), 0) / prompts.length;
    const avgContext = prompts.reduce((s, p) => s + (p.context_score || 8), 0) / prompts.length;

    if (avgClarity >= 14) strengths.push('Clear actionable intent and explicit goals');
    if (avgContext >= 10) strengths.push('Includes specific technical references and file context');
    if (avgPromptLength > 100) strengths.push('Detailed, well-formed task descriptions');

    if (strengths.length === 0) strengths.push('Active developer iterating with AI tools');

    if (avgPromptScore < 70) improvementAreas.push('Provide explicit acceptance criteria and expected outputs');
    if (avgContext < 10) improvementAreas.push('Include relevant code references, files, and language context');
    improvementAreas.push('Break very large multi-part requests into focused atomic turns');

    return {
      strengths,
      improvementAreas,
      topCategories,
      avgPromptLength,
      avgPromptScore,
      totalPrompts: prompts.length,
      totalSessions: sessions.length,
      totalTokens
    };
  }

  public static generateWeeklyReport(
    prompts: PromptRecord[],
    sessions: SessionRecord[],
    usages: UsageRecord[],
    modelStats: { model: string; requestCount: number }[]
  ): WeeklyReport {
    const totalTokens = usages.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0);
    const avgPromptScore =
      prompts.length > 0 ? Math.round(prompts.reduce((s, p) => s + p.prompt_score, 0) / prompts.length) : 0;

    const topModel = modelStats.length > 0 ? modelStats[0].model : 'Gemini 3.8 Flash (High)';

    const catCounts = new Map<string, number>();
    for (const p of prompts) {
      catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);
    }
    let mostCommonTask = 'Development';
    let maxCat = 0;
    for (const [cat, cnt] of catCounts.entries()) {
      if (cnt > maxCat) {
        maxCat = cnt;
        mostCommonTask = cat;
      }
    }

    const avgContextPercentage =
      usages.length > 0
        ? Math.round(
            usages.reduce((s, u) => s + ((u.context_tokens || 0) * 100) / (u.context_window || 1000000), 0) /
              usages.length
          )
        : 0;

    return {
      sessionsCount: sessions.length,
      promptsCount: prompts.length,
      tokensCount: totalTokens,
      avgPromptScore,
      mostUsedModel: topModel,
      mostCommonTask,
      avgContextPercentage,
      improvementAreas: [
        'Add verifiable acceptance criteria before submitting complex prompts',
        'Start fresh sessions when conversation history exceeds 20 turns',
        'Use faster models for lightweight code edits and documentation'
      ]
    };
  }
}
