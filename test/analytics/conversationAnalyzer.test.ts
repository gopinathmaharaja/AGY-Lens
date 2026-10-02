import { describe, it, expect } from 'vitest';
import { PromptImprover } from '../../src/analytics/promptImprover';
import { ConversationAnalyzer } from '../../src/analytics/conversationAnalyzer';

describe('PromptImprover', () => {
  it('should expand a vague debugging prompt into a structured template', () => {
    const raw = 'Fix my authentication crash on null token';
    const improved = PromptImprover.improve(raw, { workspaceName: 'MyAuthApp', language: 'TypeScript' });
    expect(improved).toContain('Requirements:');
    expect(improved).toContain('Expected Output:');
    expect(improved).toContain('Root cause');
    expect(improved).toContain('TypeScript');
  });
});

describe('ConversationAnalyzer', () => {
  it('should detect repeated prompts and lower efficiency score', () => {
    const turns = [
      { stepIndex: 0, type: 'USER_INPUT', source: 'USER_EXPLICIT', content: 'fix the bug in auth', timestamp: '' },
      { stepIndex: 1, type: 'PLANNER_RESPONSE', source: 'MODEL', content: 'here is fix', timestamp: '' },
      { stepIndex: 2, type: 'USER_INPUT', source: 'USER_EXPLICIT', content: 'fix the bug in auth', timestamp: '' },
      { stepIndex: 3, type: 'USER_INPUT', source: 'USER_EXPLICIT', content: 'still not working try again', timestamp: '' }
    ];

    const result = ConversationAnalyzer.analyze('conv-1', turns, 900000, 1000000);
    expect(result.repeatedPromptsCount).toBe(1);
    expect(result.efficiencyScore).toBeLessThan(90);
    expect(result.isContextApproachingLimit).toBe(true);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    expect(result.suggestedAction).toBeDefined();
  });
});
