import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import '../setup';
import { AppDatabase } from '../../src/database/database';
import { PromptRepository } from '../../src/database/repositories/promptRepository';

describe('Phase 2 - History Search, Filtering & Expensive Prompts', () => {
  let db: AppDatabase;
  let promptRepo: PromptRepository;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-history-search-test-'));
    db = new AppDatabase(tmpDir, 'test.db');
    promptRepo = new PromptRepository(db);

    // Insert sample multi-source prompts with tokens
    promptRepo.insert({
      session_id: 'conv-1',
      source: 'cli',
      step_index: 0,
      prompt: 'Refactor Redis caching layer',
      timestamp: '2026-10-02T10:00:00Z',
      category: 'Development',
      prompt_score: 85,
      estimated_input_tokens: 50,
      estimated_output_tokens: 35000 // Expensive (> 30k)
    });

    promptRepo.insert({
      session_id: 'conv-2',
      source: 'app',
      step_index: 0,
      prompt: 'Fix TypeError in authentication service',
      timestamp: '2026-10-02T11:00:00Z',
      category: 'Debugging',
      prompt_score: 60,
      estimated_input_tokens: 30,
      estimated_output_tokens: 1200
    });

    promptRepo.insert({
      session_id: 'conv-3',
      source: 'ide',
      step_index: 0,
      prompt: 'Generate unit tests for payment webhook',
      timestamp: '2026-10-02T12:00:00Z',
      category: 'Testing',
      prompt_score: 90,
      estimated_input_tokens: 40,
      estimated_output_tokens: 4000
    });
  });

  afterEach(() => {
    try {
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('should filter prompts by text query', () => {
    const results = promptRepo.searchPrompts('Redis');
    expect(results.length).toBe(1);
    expect(results[0].prompt).toContain('Redis');
  });

  it('should filter prompts by source', () => {
    const cliPrompts = promptRepo.searchPrompts(undefined, 'cli');
    expect(cliPrompts.length).toBe(1);
    expect(cliPrompts[0].source).toBe('cli');

    const appPrompts = promptRepo.searchPrompts(undefined, 'app');
    expect(appPrompts.length).toBe(1);
    expect(appPrompts[0].source).toBe('app');

    const idePrompts = promptRepo.searchPrompts(undefined, 'ide');
    expect(idePrompts.length).toBe(1);
    expect(idePrompts[0].source).toBe('ide');
  });

  it('should filter prompts by category', () => {
    const debugPrompts = promptRepo.searchPrompts(undefined, undefined, 'Debugging');
    expect(debugPrompts.length).toBe(1);
    expect(debugPrompts[0].category).toBe('Debugging');
  });

  it('should identify expensive prompts above token threshold', () => {
    const expensive = promptRepo.getExpensivePrompts(20000);
    expect(expensive.length).toBe(1);
    expect(expensive[0].prompt).toContain('Redis');
    const totalTokens = (expensive[0].estimated_input_tokens || 0) + (expensive[0].estimated_output_tokens || 0);
    expect(totalTokens).toBeGreaterThan(30000);
  });
});
