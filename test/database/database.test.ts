import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppDatabase } from '../../src/database/database';
import { SessionRepository } from '../../src/database/repositories/sessionRepository';
import { PromptRepository } from '../../src/database/repositories/promptRepository';
import { UsageRepository } from '../../src/database/repositories/usageRepository';
import { QuotaRepository } from '../../src/database/repositories/quotaRepository';

describe('Database and Repositories', () => {
  let tempDir: string;
  let db: AppDatabase;
  let sessionRepo: SessionRepository;
  let promptRepo: PromptRepository;
  let usageRepo: UsageRepository;
  let quotaRepo: QuotaRepository;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-test-'));
    db = new AppDatabase(tempDir, 'test.db');
    sessionRepo = new SessionRepository(db);
    promptRepo = new PromptRepository(db);
    usageRepo = new UsageRepository(db);
    quotaRepo = new QuotaRepository(db);
  });

  afterAll(() => {
    db.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('should insert and retrieve session records', () => {
    sessionRepo.upsert({
      conversation_id: 'conv-123',
      workspace: '/workspace',
      model: 'Gemini 3.8 Flash (High)',
      started_at: '2026-10-02T10:00:00Z',
      agent_state: 'IDLE',
      step_count: 5
    });

    const s = sessionRepo.getByConversationId('conv-123');
    expect(s).toBeDefined();
    expect(s?.model).toBe('Gemini 3.8 Flash (High)');
    expect(s?.step_count).toBe(5);
  });

  it('should insert and query prompts and calculate averages', () => {
    promptRepo.insert({
      session_id: 'conv-123',
      prompt: 'Refactor database queries',
      timestamp: '2026-10-02T10:05:00Z',
      category: 'Database',
      prompt_score: 80,
      clarity_score: 18,
      context_score: 12
    });

    promptRepo.insert({
      session_id: 'conv-123',
      prompt: 'Fix null error',
      timestamp: '2026-10-02T10:10:00Z',
      category: 'Debugging',
      prompt_score: 40,
      clarity_score: 8,
      context_score: 4
    });

    expect(promptRepo.count()).toBe(2);
    expect(promptRepo.getAverageScore()).toBe(60);
    const dist = promptRepo.getCategoryDistribution();
    expect(dist.length).toBe(2);
  });

  it('should record usage and generate daily aggregation summaries', () => {
    usageRepo.insert({
      session_id: 'conv-123',
      timestamp: new Date().toISOString(),
      input_tokens: 1500,
      output_tokens: 500,
      cache_read_tokens: 0,
      context_tokens: 2000,
      context_window: 1000000,
      model: 'Gemini 3.8 Flash (High)'
    });

    const daily = usageRepo.getDailyUsage(7);
    expect(daily.length).toBe(1);
    expect(daily[0].totalTokens).toBe(2000);
    expect(daily[0].requestCount).toBe(1);

    const today = usageRepo.getTodaySummary();
    expect(today.requests).toBe(1);
    expect(today.tokens).toBe(2000);
  });

  it('should record and fetch quota snapshots', () => {
    quotaRepo.recordQuota({
      model: 'Gemini 3.8 Flash (High)',
      remaining: 82,
      reset_time: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      is_estimate: 1
    });

    const latest = quotaRepo.getLatest();
    expect(latest).toBeDefined();
    expect(latest?.remaining).toBe(82);
  });
});
