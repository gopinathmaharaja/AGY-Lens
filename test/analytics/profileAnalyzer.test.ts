import { describe, it, expect } from 'vitest';
import { UsageAnalyzer } from '../../src/analytics/usageAnalyzer';
import { PromptRecord, SessionRecord } from '../../src/types/usage';

describe('UsageAnalyzer.generateProfile (Phase 5)', () => {
  it('computes 7 dimension averages, trajectory, best prompts, and needs improvement prompts', () => {
    const prompts: PromptRecord[] = [
      {
        id: 1,
        session_id: 's1',
        step_index: 0,
        prompt: 'Build comprehensive auth system with JWT verification and unit tests in TypeScript. Ensure 100% test coverage.',
        category: 'Development',
        prompt_score: 95,
        clarity_score: 20,
        context_score: 15,
        requirements_score: 15,
        constraints_score: 15,
        expected_output_score: 15,
        acceptance_criteria_score: 10,
        scope_score: 5,
        timestamp: '2026-10-01T10:00:00Z'
      },
      {
        id: 2,
        session_id: 's2',
        step_index: 0,
        prompt: 'fix this bug',
        category: 'Debugging',
        prompt_score: 35,
        clarity_score: 5,
        context_score: 5,
        requirements_score: 5,
        constraints_score: 5,
        expected_output_score: 5,
        acceptance_criteria_score: 5,
        scope_score: 5,
        missing_items: 'Context: file names, Constraints, Acceptance criteria',
        timestamp: '2026-10-02T10:00:00Z'
      },
      {
        id: 3,
        session_id: 's3',
        step_index: 0,
        prompt: 'Refactor database queries in auth.ts to prevent SQL injection and add query logs.',
        category: 'Refactoring',
        prompt_score: 80,
        clarity_score: 18,
        context_score: 12,
        requirements_score: 12,
        constraints_score: 12,
        expected_output_score: 12,
        acceptance_criteria_score: 8,
        scope_score: 6,
        timestamp: '2026-10-03T10:00:00Z'
      }
    ];

    const sessions: SessionRecord[] = [
      { session_id: 's1', conversation_id: 's1', started_at: '2026-10-01T10:00:00Z', step_count: 5, source: 'cli' }
    ];

    const profile = UsageAnalyzer.generateProfile(prompts, sessions, []);

    expect(profile.totalPrompts).toBe(3);
    expect(profile.avgPromptScore).toBe(70);

    // Dimension Averages
    expect(profile.dimensionAverages).toBeDefined();
    expect(profile.dimensionAverages!.clarity).toBeGreaterThan(10);
    expect(profile.dimensionAverages!.context).toBeDefined();

    // Category scores ranking (Debugging had 35, Refactoring had 80, Development had 95)
    expect(profile.categoryScores).toBeDefined();
    expect(profile.categoryScores![0].category).toBe('Debugging');
    expect(profile.categoryScores![0].avgScore).toBe(35);

    // Best prompts templates (score >= 75: s1 and s3)
    expect(profile.bestPrompts).toBeDefined();
    expect(profile.bestPrompts!.length).toBe(2);
    expect(profile.bestPrompts![0].prompt_score).toBe(95);

    // Needs improvement (score < 60: s2)
    expect(profile.needsImprovementPrompts).toBeDefined();
    expect(profile.needsImprovementPrompts!.length).toBe(1);
    expect(profile.needsImprovementPrompts![0].prompt_score).toBe(35);

    // Score trend
    expect(profile.scoreTrend).toBeDefined();
    expect(profile.scoreTrend!.length).toBe(3);
  });
});
