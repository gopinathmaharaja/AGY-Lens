import { describe, it, expect } from 'vitest';
import { UsageAnalyzer } from '../../src/analytics/usageAnalyzer';
import { PromptRecord, SessionRecord, UsageRecord } from '../../src/types/usage';

describe('UsageAnalyzer.generateWeeklyReport', () => {
  it('returns graceful defaults when no prompts or sessions exist', () => {
    const report = UsageAnalyzer.generateWeeklyReport([], [], [], []);
    expect(report.sessionsCount).toBe(0);
    expect(report.promptsCount).toBe(0);
    expect(report.tokensCount).toBe(0);
    expect(report.avgPromptScore).toBe(0);
    expect(report.improvementAreas.length).toBeGreaterThan(0);
    expect(report.improvementAreas[0]).toContain('Excellent');
    expect(report.sourceBreakdown).toEqual({ cliCount: 0, appCount: 0, ideCount: 0 });
    expect(report.topExpensivePrompts).toEqual([]);
    expect(report.lowestScoringPrompts).toEqual([]);
  });

  it('computes accurate totals, source breakdown, top expensive and low scoring prompts', () => {
    const now = new Date().toISOString();
    const prompts: PromptRecord[] = [
      {
        id: 1,
        session_id: 's1',
        step_index: 0,
        prompt: 'Fix crash in auth module when token is null',
        category: 'Debugging',
        prompt_score: 45,
        clarity_score: 10,
        context_score: 5,
        estimated_input_tokens: 500,
        estimated_output_tokens: 35000,
        source: 'cli',
        missing_items: 'Context: file names, Acceptance criteria: verification steps',
        timestamp: now
      },
      {
        id: 2,
        session_id: 's2',
        step_index: 0,
        prompt: 'Implement new user signup flow with validation and tests',
        category: 'Development',
        prompt_score: 85,
        clarity_score: 18,
        context_score: 18,
        estimated_input_tokens: 1200,
        estimated_output_tokens: 4500,
        source: 'app',
        missing_items: '',
        timestamp: now
      },
      {
        id: 3,
        session_id: 's3',
        step_index: 0,
        prompt: 'quick fix',
        category: 'Debugging',
        prompt_score: 30,
        clarity_score: 5,
        context_score: 2,
        estimated_input_tokens: 100,
        estimated_output_tokens: 1500,
        source: 'ide',
        missing_items: 'Context: target file',
        timestamp: now
      }
    ];

    const sessions: SessionRecord[] = [
      { session_id: 's1', conversation_id: 's1', started_at: now, step_count: 5, source: 'cli' },
      { session_id: 's2', conversation_id: 's2', started_at: now, step_count: 10, source: 'app' },
      { session_id: 's3', conversation_id: 's3', started_at: now, step_count: 28, source: 'ide' }
    ];

    const modelStats = [{ model: 'Gemini 3.8 Flash', count: 3 }];

    const report = UsageAnalyzer.generateWeeklyReport(prompts, sessions, [], modelStats);

    expect(report.promptsCount).toBe(3);
    expect(report.sessionsCount).toBe(3);
    // Total tokens = (500+35000) + (1200+4500) + (100+1500) = 35500 + 5700 + 1600 = 42800
    expect(report.tokensCount).toBe(42800);
    expect(report.mostUsedModel).toBe('Gemini 3.8 Flash');
    expect(report.mostCommonTask).toBe('Debugging');

    // Source breakdown
    expect(report.sourceBreakdown).toEqual({
      cliCount: 1,
      appCount: 1,
      ideCount: 1
    });

    // Top expensive prompts: s1 prompt has 35500 tokens
    expect(report.topExpensivePrompts).toBeDefined();
    expect(report.topExpensivePrompts!.length).toBe(3);
    expect(report.topExpensivePrompts![0].tokens).toBe(35500);
    expect(report.topExpensivePrompts![0].source).toBe('cli');

    // Lowest scoring prompts: s3 (30) and s1 (45)
    expect(report.lowestScoringPrompts).toBeDefined();
    expect(report.lowestScoringPrompts!.length).toBe(2);
    expect(report.lowestScoringPrompts![0].score).toBe(30);
    expect(report.lowestScoringPrompts![0].suggestion).toContain('target file names');

    // Dynamic improvement suggestions derived from data
    expect(report.improvementAreas.some(msg => msg.includes('session(s) ran longer than 25 steps'))).toBe(true);
    expect(report.improvementAreas.some(msg => msg.includes('Debugging'))).toBe(true);
    expect(report.improvementAreas.some(msg => msg.includes('most expensive prompt accounted for'))).toBe(true);
  });

  it('calculates week-over-week trends accurately', () => {
    const now = new Date().toISOString();
    const activePrompts: PromptRecord[] = [
      {
        id: 1,
        session_id: 's1',
        step_index: 0,
        prompt: 'Test prompt for active week with decent description',
        category: 'Development',
        prompt_score: 80,
        estimated_input_tokens: 1000,
        estimated_output_tokens: 2000,
        timestamp: now
      },
      {
        id: 2,
        session_id: 's2',
        step_index: 0,
        prompt: 'Second prompt for active week',
        category: 'Development',
        prompt_score: 90,
        estimated_input_tokens: 1000,
        estimated_output_tokens: 2000,
        timestamp: now
      }
    ];

    const prevWeekPrompts: PromptRecord[] = [
      {
        id: 10,
        session_id: 'old-1',
        step_index: 0,
        prompt: 'Old prompt',
        category: 'Development',
        prompt_score: 70,
        estimated_input_tokens: 500,
        estimated_output_tokens: 1500,
        timestamp: new Date(Date.now() - 10 * 86400000).toISOString()
      }
    ];

    const allPrompts = [...activePrompts, ...prevWeekPrompts];
    const report = UsageAnalyzer.generateWeeklyReport(allPrompts, [], [], []);

    expect(report.weekOverWeek).toBeDefined();
    // Prompts went from 1 to 2 -> +100%
    expect(report.weekOverWeek!.promptsDiff).toBe(100);
    // Tokens went from 2000 to 6000 -> +200%
    expect(report.weekOverWeek!.tokensDiff).toBe(200);
    // Avg score went from 70 to 85 -> +15
    expect(report.weekOverWeek!.scoreDiff).toBe(15);
  });
});
