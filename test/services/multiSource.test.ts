import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppDatabase } from '../../src/database/database';
import { PromptRepository } from '../../src/database/repositories/promptRepository';
import { SessionRepository } from '../../src/database/repositories/sessionRepository';
import { UsageRepository } from '../../src/database/repositories/usageRepository';
import { AntigravityCollector } from '../../src/collectors/antigravityCollector';
import { TranscriptParser } from '../../src/parsers/transcriptParser';

describe('Phase 1 Foundation - Multi-Source & Accurate Accounting', () => {
  let db: AppDatabase;
  let promptRepo: PromptRepository;
  let sessionRepo: SessionRepository;
  let usageRepo: UsageRepository;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-multisource-test-'));
    db = new AppDatabase(tmpDir, 'test.db');
    promptRepo = new PromptRepository(db);
    sessionRepo = new SessionRepository(db);
    usageRepo = new UsageRepository(db);
  });

  afterEach(() => {
    try {
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('should discover all conversations across CLI, App, and IDE', () => {
    const collector = new AntigravityCollector();
    const convs = collector.getAllConversations();
    expect(Array.isArray(convs)).toBe(true);
    // Real system has 73+ conversations
    expect(convs.length).toBeGreaterThan(0);

    for (const c of convs) {
      expect(['cli', 'app', 'ide']).toContain(c.source);
      expect(typeof c.id).toBe('string');
      expect(typeof c.brainDir).toBe('string');
    }
  });

  it('should prevent duplicate prompt insertion for same session and step_index', () => {
    const p1 = promptRepo.insert({
      session_id: 'conv-xyz',
      source: 'cli',
      step_index: 0,
      prompt: 'First prompt',
      timestamp: new Date().toISOString(),
      category: 'Development',
      prompt_score: 75,
      estimated_input_tokens: 15,
      estimated_output_tokens: 120
    });
    expect(p1).toBeDefined();

    // Re-inserting same session and step index should be ignored (deduplicated)
    const p2 = promptRepo.insert({
      session_id: 'conv-xyz',
      source: 'cli',
      step_index: 0,
      prompt: 'First prompt duplicate',
      timestamp: new Date().toISOString(),
      category: 'Development',
      prompt_score: 75,
      estimated_input_tokens: 15,
      estimated_output_tokens: 120
    });
    expect(p2).toBeUndefined();
    expect(promptRepo.countBySession('conv-xyz')).toBe(1);

    // Second prompt in same session with step_index: 1 should succeed
    const p3 = promptRepo.insert({
      session_id: 'conv-xyz',
      source: 'cli',
      step_index: 1,
      prompt: 'Second prompt',
      timestamp: new Date().toISOString(),
      category: 'Debugging',
      prompt_score: 85,
      estimated_input_tokens: 25,
      estimated_output_tokens: 200
    });
    expect(p3).toBeDefined();
    expect(promptRepo.countBySession('conv-xyz')).toBe(2);
  });

  it('should track source attribution across CLI, App, and IDE in sessions and prompts', () => {
    sessionRepo.upsert({
      conversation_id: 'conv-ide-1',
      source: 'ide',
      workspace: 'D:\\Projects\\Test',
      model: 'Gemini 3.8 Flash',
      started_at: new Date().toISOString(),
      agent_state: 'IDLE',
      step_count: 10
    });

    sessionRepo.upsert({
      conversation_id: 'conv-cli-1',
      source: 'cli',
      workspace: 'D:\\Projects\\Test',
      model: 'Claude Opus 4.6',
      started_at: new Date().toISOString(),
      agent_state: 'IDLE',
      step_count: 5
    });

    const ideSessions = sessionRepo.getBySource('ide');
    expect(ideSessions.length).toBe(1);
    expect(ideSessions[0].conversation_id).toBe('conv-ide-1');

    const cliSessions = sessionRepo.getBySource('cli');
    expect(cliSessions.length).toBe(1);
    expect(cliSessions[0].conversation_id).toBe('conv-cli-1');
  });

  it('should accurately calculate per-prompt token breakdown from transcript parser', () => {
    const rawStep1 = JSON.stringify({
      step_index: 0,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      content: '<USER_REQUEST>Refactor the authentication module</USER_REQUEST>',
      created_at: '2026-10-02T10:00:00Z'
    });
    const rawStep2 = JSON.stringify({
      step_index: 1,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      content: 'I will refactor the authentication module using JWT tokens and secure cookies.',
      thinking: 'Analyzing the codebase structure and authentication flow...',
      created_at: '2026-10-02T10:00:05Z'
    });

    const parsed = TranscriptParser.parseAllLines([rawStep1, rawStep2], 'test-conv');
    expect(parsed.userPrompts.length).toBe(1);
    expect(parsed.userPrompts[0].prompt).toBe('Refactor the authentication module');
    expect(parsed.userPrompts[0].inputTokens).toBeGreaterThan(0);
    expect(parsed.userPrompts[0].outputTokens).toBeGreaterThan(0);
    expect(parsed.inputTokens).toBe(parsed.userPrompts[0].inputTokens);
    expect(parsed.outputTokens).toBe(parsed.userPrompts[0].outputTokens);
  });
});
