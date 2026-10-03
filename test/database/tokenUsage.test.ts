import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppDatabase } from '../../src/database/database';
import { PromptRepository } from '../../src/database/repositories/promptRepository';
import { UsageRepository } from '../../src/database/repositories/usageRepository';

describe('UsageRepository Token Metrics (Phase 4)', () => {
  let tempDir: string;
  let db: AppDatabase;
  let promptRepo: PromptRepository;
  let usageRepo: UsageRepository;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-token-test-'));
    db = new AppDatabase(tempDir, 'test.db');
    promptRepo = new PromptRepository(db);
    usageRepo = new UsageRepository(db);
  });

  afterAll(() => {
    db.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('aggregates today and week summaries accurately', () => {
    const todayStr = new Date().toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();

    // Insert prompts: today
    promptRepo.insert({
      session_id: 's-today',
      step_index: 0,
      prompt: 'today prompt 1',
      category: 'Debugging',
      estimated_input_tokens: 300,
      estimated_output_tokens: 1200,
      source: 'cli',
      timestamp: todayStr
    });
    promptRepo.insert({
      session_id: 's-today',
      step_index: 1,
      prompt: 'today prompt 2',
      category: 'Development',
      estimated_input_tokens: 500,
      estimated_output_tokens: 2500,
      source: 'app',
      timestamp: todayStr
    });

    // Insert prompts: 3 days ago (in this week)
    promptRepo.insert({
      session_id: 's-week',
      step_index: 0,
      prompt: 'week prompt',
      category: 'Refactoring',
      estimated_input_tokens: 1000,
      estimated_output_tokens: 4000,
      source: 'ide',
      timestamp: threeDaysAgo
    });

    // Insert prompts: 10 days ago (outside this week)
    promptRepo.insert({
      session_id: 's-old',
      step_index: 0,
      prompt: 'old prompt',
      category: 'Testing',
      estimated_input_tokens: 200,
      estimated_output_tokens: 800,
      source: 'cli',
      timestamp: tenDaysAgo
    });

    // Test Today Summary: 2 requests, (300+1200) + (500+2500) = 4500 tokens
    const todaySummary = usageRepo.getTodaySummary();
    expect(todaySummary.requests).toBe(2);
    expect(todaySummary.tokens).toBe(4500);

    // Test Week Summary: today (2) + 3 days ago (1) = 3 requests, 4500 + 5000 = 9500 tokens
    const weekSummary = usageRepo.getWeekSummary();
    expect(weekSummary.requests).toBe(3);
    expect(weekSummary.tokens).toBe(9500);
  });

  it('aggregates tokens by task category correctly', () => {
    const cats = usageRepo.getTokensByCategory();
    expect(cats.length).toBeGreaterThanOrEqual(3);

    // Refactoring had 5000 tokens, Development had 3000, Debugging had 1500, Testing had 1000
    const refactoring = cats.find((c) => c.category === 'Refactoring');
    expect(refactoring).toBeDefined();
    expect(refactoring!.totalTokens).toBe(5000);
    expect(refactoring!.promptCount).toBe(1);

    const dev = cats.find((c) => c.category === 'Development');
    expect(dev).toBeDefined();
    expect(dev!.totalTokens).toBe(3000);

    const debug = cats.find((c) => c.category === 'Debugging');
    expect(debug).toBeDefined();
    expect(debug!.totalTokens).toBe(1500);
  });

  it('aggregates usage by source correctly', () => {
    const sources = usageRepo.getUsageBySource();
    expect(sources.length).toBeGreaterThanOrEqual(3);

    const ide = sources.find((s) => s.source === 'ide');
    expect(ide).toBeDefined();
    expect(ide!.totalTokens).toBe(5000);

    const app = sources.find((s) => s.source === 'app');
    expect(app).toBeDefined();
    expect(app!.totalTokens).toBe(3000);

    const cli = sources.find((s) => s.source === 'cli');
    expect(cli).toBeDefined();
    // CLI had today prompt 1 (1500) + old prompt (1000) = 2500
    expect(cli!.totalTokens).toBe(2500);
    expect(cli!.promptCount).toBe(2);
  });
});
