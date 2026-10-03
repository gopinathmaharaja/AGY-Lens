import { describe, it, expect } from 'vitest';
import { QuotaCollector } from '../../src/collectors/quotaCollector';

describe('QuotaCollector (Honest Quota)', () => {
  it('should return null and Unavailable when no quota is reported', () => {
    const snapshot = QuotaCollector.collect('Gemini 3.8 Flash (High)');
    expect(snapshot.remainingPercentage).toBeNull();
    expect(snapshot.resetTimeIso).toBeNull();
    expect(snapshot.countdownDisplay).toBe('Unavailable');
    expect(snapshot.isEstimate).toBe(false);
  });

  it('should not fabricate 85% or 4h reset', () => {
    const snapshot = QuotaCollector.collect('Gemini 3.8 Flash (High)', null, null);
    expect(snapshot.remainingPercentage).not.toBe(85);
    expect(snapshot.countdownDisplay).not.toContain('4h');
  });

  it('should respect observed quota when provided', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const snapshot = QuotaCollector.collect('Gemini 3.8 Flash (High)', 60, future);
    expect(snapshot.remainingPercentage).toBe(60);
    expect(snapshot.resetTimeIso).toBe(future);
    expect(snapshot.countdownDisplay).toContain('h');
  });
});
