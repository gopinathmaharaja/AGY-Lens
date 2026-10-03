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

  it('should seamlessly migrate a legacy database that lacked source column and newer fields', () => {
    const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-legacy-'));
    const legacyDbPath = path.join(legacyDir, 'legacy.db');

    // Simulate an older v0.0.x database schema
    const { DatabaseSync } = require('node:sqlite');
    const rawDb = new DatabaseSync(legacyDbPath);
    rawDb.exec(`
      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT UNIQUE NOT NULL,
        workspace TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        agent_state TEXT NOT NULL DEFAULT 'IDLE',
        title TEXT NOT NULL DEFAULT '',
        step_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        prompt TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        prompt_score REAL NOT NULL DEFAULT 0,
        clarity_score REAL DEFAULT 0,
        context_score REAL DEFAULT 0,
        missing_items TEXT DEFAULT ''
      );
      CREATE TABLE quota (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        remaining REAL,
        reset_time TEXT,
        timestamp TEXT NOT NULL,
        is_estimate INTEGER NOT NULL DEFAULT 0
      );
    `);
    rawDb.close();

    // Opening with AppDatabase should migrate without throwing "no such column: source"
    expect(() => {
      const migratedDb = new AppDatabase(legacyDir, 'legacy.db');
      // Test repositories on migrated DB
      const sRepo = new SessionRepository(migratedDb);
      const pRepo = new PromptRepository(migratedDb);
      const qRepo = new QuotaRepository(migratedDb);

      sRepo.upsert({
        conversation_id: 'legacy-conv',
        workspace: '/test',
        model: 'Gemini 3.8 Flash (High)',
        started_at: '2026-10-02T10:00:00Z',
        agent_state: 'IDLE',
        step_count: 1,
        source: 'ide'
      });

      pRepo.insert({
        session_id: 'legacy-conv',
        prompt: 'Migrated test prompt',
        timestamp: '2026-10-02T10:05:00Z',
        category: 'Test',
        source: 'ide'
      });

      qRepo.recordQuota({
        model: 'Gemini 3.8 Flash (High)',
        remaining: 90,
        reset_time: null,
        timestamp: '2026-10-02T10:05:00Z',
        source: 'observed'
      });

      const session = sRepo.getByConversationId('legacy-conv');
      expect(session?.source).toBe('ide');
      expect(pRepo.getBySessionId('legacy-conv')[0].source).toBe('ide');

      migratedDb.close();
    }).not.toThrow();

    try {
      fs.rmSync(legacyDir, { recursive: true, force: true });
    } catch {}
  });
});

