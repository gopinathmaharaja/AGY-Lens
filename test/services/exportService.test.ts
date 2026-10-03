import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppDatabase } from '../../src/database/database';
import { PromptRepository } from '../../src/database/repositories/promptRepository';
import { UsageRepository } from '../../src/database/repositories/usageRepository';
import { SessionRepository } from '../../src/database/repositories/sessionRepository';
import { ExportService } from '../../src/services/exportService';

describe('ExportService (Phase 8)', () => {
  let tempDir: string;
  let db: AppDatabase;
  let promptRepo: PromptRepository;
  let usageRepo: UsageRepository;
  let sessionRepo: SessionRepository;
  let exportService: ExportService;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigravity-export-test-'));
    db = new AppDatabase(tempDir, 'test.db');
    promptRepo = new PromptRepository(db);
    usageRepo = new UsageRepository(db);
    sessionRepo = new SessionRepository(db);
    exportService = new ExportService(sessionRepo, promptRepo, usageRepo);

    // Seed test session
    sessionRepo.upsert({
      conversation_id: 'conv-export-1',
      source: 'cli',
      workspace: 'D:/Projects/App',
      model: 'Gemini 3.8 Flash (High)',
      started_at: '2026-10-03T10:00:00Z',
      agent_state: 'IDLE',
      step_count: 5
    });

    // Seed test prompt
    promptRepo.insert({
      session_id: 'conv-export-1',
      step_index: 0,
      prompt: 'Implement auth with JWT "secret-key"',
      category: 'Development',
      prompt_score: 85,
      estimated_input_tokens: 450,
      estimated_output_tokens: 2200,
      source: 'cli',
      timestamp: '2026-10-03T10:01:00Z'
    });
  });

  afterAll(() => {
    db.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('exports prompts to CSV with source attribution and tokens', async () => {
    const csvPath = path.join(tempDir, 'export.csv');
    await exportService.exportToCsv(csvPath);

    expect(fs.existsSync(csvPath)).toBe(true);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines[0]).toBe('timestamp,source,prompt,category,score,input_tokens,output_tokens,total_tokens,model,workspace');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1]).toContain('cli');
    expect(lines[1]).toContain('Development');
    expect(lines[1]).toContain('450');
    expect(lines[1]).toContain('2200');
    expect(lines[1]).toContain('2650');
  });

  it('exports comprehensive Markdown report with multi-source breakdown', async () => {
    const mdPath = path.join(tempDir, 'report.md');
    await exportService.exportToMarkdown(mdPath);

    expect(fs.existsSync(mdPath)).toBe(true);
    const content = fs.readFileSync(mdPath, 'utf-8');

    expect(content).toContain('# Antigravity Usage Intelligence Report');
    expect(content).toContain('## 1. Executive Summary');
    expect(content).toContain('## 2. Multi-Source Distribution');
    expect(content).toContain('## 3. Models Usage');
  });

  it('exports and re-imports JSON data cleanly', async () => {
    const jsonPath = path.join(tempDir, 'export.json');
    await exportService.exportToJson(jsonPath, { includePrompts: true, redactSecrets: true });

    expect(fs.existsSync(jsonPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(parsed.sessions.length).toBeGreaterThan(0);
    expect(parsed.prompts.length).toBeGreaterThan(0);
    expect(parsed.prompts[0].source).toBe('cli');

    // Test import
    const result = await exportService.importFromJson(jsonPath);
    expect(result.sessionsImported).toBeGreaterThan(0);
  });
});
