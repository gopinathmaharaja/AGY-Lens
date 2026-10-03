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
  weekOverWeek?: {
    promptsDiff: number; // percentage change (+15, -10)
    tokensDiff: number;
    scoreDiff: number; // point change (+5, -3)
    sessionsDiff: number;
  };
  topExpensivePrompts?: {
    prompt: string;
    source: string;
    tokens: number;
    category: string;
  }[];
  lowestScoringPrompts?: {
    prompt: string;
    score: number;
    missingItems: string;
    suggestion: string;
  }[];
  sourceBreakdown?: {
    cliCount: number;
    appCount: number;
    ideCount: number;
  };
  dailyTrend?: {
    date: string;
    prompts: number;
    tokens: number;
  }[];
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

    // Calculate tokens from prompts if available, else usages
    const promptTokens = prompts.reduce(
      (sum, p) => sum + (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0),
      0
    );
    const usageTokens = usages.reduce((sum, u) => sum + (u.input_tokens || 0) + (u.output_tokens || 0), 0);
    const totalTokens = promptTokens > 0 ? promptTokens : usageTokens;

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

    // 7 Transparent Dimension Averages
    const dimensionAverages = {
      clarity: Math.round((prompts.reduce((s, p) => s + (p.clarity_score || 0), 0) / prompts.length) * 10) / 10,
      context: Math.round((prompts.reduce((s, p) => s + (p.context_score || 0), 0) / prompts.length) * 10) / 10,
      requirements: Math.round((prompts.reduce((s, p) => s + (p.requirements_score || 0), 0) / prompts.length) * 10) / 10,
      constraints: Math.round((prompts.reduce((s, p) => s + (p.constraints_score || 0), 0) / prompts.length) * 10) / 10,
      expectedOutput: Math.round((prompts.reduce((s, p) => s + (p.expected_output_score || 0), 0) / prompts.length) * 10) / 10,
      acceptanceCriteria: Math.round((prompts.reduce((s, p) => s + (p.acceptance_criteria_score || 0), 0) / prompts.length) * 10) / 10,
      scope: Math.round((prompts.reduce((s, p) => s + (p.scope_score || 0), 0) / prompts.length) * 10) / 10
    };

    // Category Average Scores
    const catScoresMap = new Map<string, { totalScore: number; count: number }>();
    for (const p of prompts) {
      const cur = catScoresMap.get(p.category) || { totalScore: 0, count: 0 };
      cur.totalScore += p.prompt_score;
      cur.count++;
      catScoresMap.set(p.category, cur);
    }
    const categoryScores = Array.from(catScoresMap.entries())
      .map(([category, stats]) => ({
        category,
        avgScore: Math.round(stats.totalScore / stats.count),
        count: stats.count
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    // Score Trend over Time
    const dateMap = new Map<string, { totalScore: number; count: number }>();
    for (const p of prompts) {
      const d = (p.timestamp || '').slice(0, 10);
      if (d) {
        const cur = dateMap.get(d) || { totalScore: 0, count: 0 };
        cur.totalScore += p.prompt_score;
        cur.count++;
        dateMap.set(d, cur);
      }
    }
    const scoreTrend = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        avgScore: Math.round(stats.totalScore / stats.count),
        count: stats.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Improvement Trajectory (compare older half vs newer half)
    let improvementTrajectory = 'Consistent prompt quality maintained.';
    if (prompts.length >= 6) {
      const sortedByTime = [...prompts].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
      const half = Math.floor(sortedByTime.length / 2);
      const olderAvg = sortedByTime.slice(0, half).reduce((s, p) => s + p.prompt_score, 0) / half;
      const newerAvg = sortedByTime.slice(half).reduce((s, p) => s + p.prompt_score, 0) / (sortedByTime.length - half);
      const diff = Math.round(((newerAvg - olderAvg) / Math.max(1, olderAvg)) * 100);
      if (diff > 0) {
        improvementTrajectory = `Your prompt quality improved by +${diff}% over time!`;
      } else if (diff < -5) {
        improvementTrajectory = `Prompt quality slipped by ${diff}% recently — check missing constraints or criteria.`;
      }
    }

    // Best Prompts (templates)
    const bestPrompts = [...prompts]
      .filter((p) => p.prompt_score >= 75)
      .sort((a, b) => b.prompt_score - a.prompt_score)
      .slice(0, 5);

    // Needs Improvement
    const needsImprovementPrompts = [...prompts]
      .filter((p) => p.prompt_score < 60)
      .sort((a, b) => a.prompt_score - b.prompt_score)
      .slice(0, 5);

    return {
      strengths,
      improvementAreas,
      topCategories,
      avgPromptLength,
      avgPromptScore,
      totalPrompts: prompts.length,
      totalSessions: sessions.length,
      totalTokens,
      dimensionAverages,
      scoreTrend,
      categoryScores,
      improvementTrajectory,
      bestPrompts,
      needsImprovementPrompts
    };
  }

  public static generateWeeklyReport(
    prompts: PromptRecord[],
    sessions: SessionRecord[],
    usages: UsageRecord[],
    modelStats: { model: string; requestCount: number }[]
  ): WeeklyReport {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    // Split prompts into this week and previous week
    const thisWeekPrompts = prompts.filter((p) => {
      const t = new Date(p.timestamp).getTime();
      return !isNaN(t) && t >= sevenDaysAgo;
    });

    // If all historical prompts are older (e.g. historical scan), use all available prompts
    const activePrompts = thisWeekPrompts.length > 0 ? thisWeekPrompts : prompts;

    const prevWeekPrompts = prompts.filter((p) => {
      const t = new Date(p.timestamp).getTime();
      return !isNaN(t) && t >= fourteenDaysAgo && t < sevenDaysAgo;
    });

    // Token accounting
    const promptTokens = activePrompts.reduce(
      (sum, p) => sum + (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0),
      0
    );
    const usageTokens = usages.reduce((sum, u) => sum + (u.input_tokens || 0) + (u.output_tokens || 0), 0);
    const totalTokens = promptTokens > 0 ? promptTokens : usageTokens;

    const avgPromptScore =
      activePrompts.length > 0 ? Math.round(activePrompts.reduce((s, p) => s + p.prompt_score, 0) / activePrompts.length) : 0;

    const topModel = modelStats.length > 0 ? modelStats[0].model : 'Gemini 3.8 Flash (High)';

    // Category distribution
    const catCounts = new Map<string, number>();
    for (const p of activePrompts) {
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

    // Source breakdown
    let cliCount = 0;
    let appCount = 0;
    let ideCount = 0;
    for (const p of activePrompts) {
      if (p.source === 'ide') ideCount++;
      else if (p.source === 'app') appCount++;
      else cliCount++;
    }

    // Top 5 most expensive prompts
    const topExpensivePrompts = [...activePrompts]
      .map((p) => ({
        prompt: p.prompt,
        source: p.source || 'cli',
        tokens: (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0),
        category: p.category || 'Other'
      }))
      .filter((p) => p.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    // Top 3 lowest scoring prompts with actionable improvement suggestions
    const lowestScoringPrompts = [...activePrompts]
      .filter((p) => p.prompt_score < 75)
      .sort((a, b) => a.prompt_score - b.prompt_score)
      .slice(0, 3)
      .map((p) => {
        let suggestion = 'Add specific technical requirements and expected outcomes.';
        const missing = p.missing_items || '';
        if (missing.includes('Acceptance criteria')) {
          suggestion = 'Specify exact test cases, output shapes, or success criteria.';
        } else if (missing.includes('Context')) {
          suggestion = 'Mention target file names, existing libraries, and framework versions.';
        } else if (missing.includes('Constraints')) {
          suggestion = 'Specify constraints such as backward compatibility or performance budgets.';
        }
        return {
          prompt: p.prompt,
          score: p.prompt_score,
          missingItems: p.missing_items || 'Context & Details',
          suggestion
        };
      });

    // Week-over-week trends
    let weekOverWeek: WeeklyReport['weekOverWeek'] = undefined;
    if (prevWeekPrompts.length > 0) {
      const prevTokens = prevWeekPrompts.reduce(
        (sum, p) => sum + (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0),
        0
      );
      const prevAvgScore = Math.round(prevWeekPrompts.reduce((s, p) => s + p.prompt_score, 0) / prevWeekPrompts.length);

      const promptsDiff = Math.round(((activePrompts.length - prevWeekPrompts.length) / prevWeekPrompts.length) * 100);
      const tokensDiff = prevTokens > 0 ? Math.round(((totalTokens - prevTokens) / prevTokens) * 100) : 0;
      const scoreDiff = avgPromptScore - prevAvgScore;

      weekOverWeek = {
        promptsDiff,
        tokensDiff,
        scoreDiff,
        sessionsDiff: 0
      };
    }

    // Daily Trend
    const dayMap = new Map<string, { prompts: number; tokens: number }>();
    for (const p of activePrompts) {
      const d = (p.timestamp || '').slice(0, 10);
      if (d) {
        const cur = dayMap.get(d) || { prompts: 0, tokens: 0 };
        cur.prompts++;
        cur.tokens += (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0);
        dayMap.set(d, cur);
      }
    }
    const dailyTrend = Array.from(dayMap.entries())
      .map(([date, stats]) => ({ date, prompts: stats.prompts, tokens: stats.tokens }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Dynamic, data-driven improvement suggestions
    const improvementAreas: string[] = [];

    if (activePrompts.length > 0) {
      const avgLength = activePrompts.reduce((sum, p) => sum + p.prompt.length, 0) / activePrompts.length;
      const lowScoringPromptsList = activePrompts.filter((p) => p.prompt_score < 60);
      const lowScoreRatio = lowScoringPromptsList.length / activePrompts.length;

      if (avgLength < 35) {
        improvementAreas.push(
          `Your prompts average ${Math.round(avgLength)} characters. Short prompts often omit file context and require follow-up round trips.`
        );
      }

      if (lowScoreRatio > 0.35) {
        improvementAreas.push(
          `${Math.round(lowScoreRatio * 100)}% of your prompts scored below 60/100. Structure tasks with explicit files, changes, and verification steps.`
        );
      }

      const missingCriteria = activePrompts.filter((p) => (p.missing_items || '').includes('Acceptance criteria')).length;
      if (missingCriteria > activePrompts.length * 0.3) {
        improvementAreas.push(
          'Frequent missing acceptance criteria: tell the model how to verify its changes (e.g. run test command or check error code).'
        );
      }

      const longSessions = sessions.filter((s) => s.step_count > 25);
      if (longSessions.length > 0) {
        improvementAreas.push(
          `${longSessions.length} session(s) ran longer than 25 steps. Consider starting fresh sessions for distinct subtasks to prevent context drift.`
        );
      }

      const debugCount = catCounts.get('Debugging') || 0;
      if (debugCount > activePrompts.length * 0.45) {
        improvementAreas.push(
          `${Math.round((debugCount / activePrompts.length) * 100)}% of queries are Debugging. Pasting stack traces and error logs directly cuts turnaround time in half.`
        );
      }

      if (topExpensivePrompts.length > 0 && topExpensivePrompts[0].tokens > 30000) {
        const topPercent = Math.round((topExpensivePrompts[0].tokens / Math.max(1, totalTokens)) * 100);
        improvementAreas.push(
          `Your single most expensive prompt accounted for ${topPercent}% of tokens (${topExpensivePrompts[0].tokens.toLocaleString()} tk). Breaking massive refactors into phased chunks saves context.`
        );
      }
    }

    if (improvementAreas.length === 0) {
      improvementAreas.push(
        'Excellent prompting hygiene! Your prompts include detailed requirements and manageable turn counts.'
      );
    }

    return {
      sessionsCount: sessions.length,
      promptsCount: activePrompts.length,
      tokensCount: totalTokens,
      avgPromptScore,
      mostUsedModel: topModel,
      mostCommonTask,
      avgContextPercentage,
      improvementAreas,
      weekOverWeek,
      topExpensivePrompts,
      lowestScoringPrompts,
      sourceBreakdown: {
        cliCount,
        appCount,
        ideCount
      },
      dailyTrend
    };
  }
}
