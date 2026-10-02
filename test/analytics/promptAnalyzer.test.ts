import { describe, it, expect } from 'vitest';
import { PromptClassifier } from '../../src/analytics/promptClassifier';
import { PromptAnalyzer } from '../../src/analytics/promptAnalyzer';

describe('PromptClassifier', () => {
  it('should categorize database queries correctly', () => {
    expect(PromptClassifier.classify('Optimize this slow MongoDB aggregation pipeline')).toBe('Database');
    expect(PromptClassifier.classify('Write a Postgres migration for the users table')).toBe('Database');
  });

  it('should categorize debugging tasks', () => {
    expect(PromptClassifier.classify('Fix TypeError: Cannot read properties of undefined in auth.js')).toBe('Debugging');
    expect(PromptClassifier.classify('The build failed with syntax error in line 42')).toBe('Debugging');
  });

  it('should categorize testing tasks', () => {
    expect(PromptClassifier.classify('Add unit tests with vitest for user service')).toBe('Testing');
  });

  it('should categorize refactoring tasks', () => {
    expect(PromptClassifier.classify('Refactor the payment processor to extract helper functions')).toBe('Refactoring');
  });
});

describe('PromptAnalyzer', () => {
  it('should assign a low score to vague prompts and identify missing items', () => {
    const analysis = PromptAnalyzer.analyze('Fix this');
    expect(analysis.score).toBeLessThan(50);
    expect(analysis.isVague).toBe(true);
    expect(analysis.missingItems.length).toBeGreaterThan(2);
  });

  it('should assign a high score to well-structured prompts with constraints and requirements', () => {
    const prompt = `
      Implement a JWT authentication middleware in TypeScript for an Express service.

      Requirements:
      - Verify Bearer token from Authorization header
      - Handle expired token errors gracefully with 401 status
      - Attach decoded payload to req.user

      Constraints:
      - Do not break existing public route interfaces
      - Avoid external heavy libraries

      Expected Output:
      1. Middleware file
      2. Unit tests covering valid and expired tokens
      3. Acceptance criteria: all unit tests pass with zero lint errors
    `;
    const analysis = PromptAnalyzer.analyze(prompt);
    expect(analysis.score).toBeGreaterThanOrEqual(80);
    expect(analysis.isVague).toBe(false);
    expect(analysis.dimensionScores.requirements).toBeGreaterThanOrEqual(10);
    expect(analysis.dimensionScores.constraints).toBeGreaterThanOrEqual(10);
    expect(analysis.dimensionScores.expectedOutput).toBeGreaterThanOrEqual(10);
    expect(analysis.strengths.length).toBeGreaterThanOrEqual(2);
  });
});
