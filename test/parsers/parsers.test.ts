import { describe, it, expect } from 'vitest';
import { ModelParser } from '../../src/parsers/modelParser';
import { StatusParser } from '../../src/parsers/statusParser';
import { TranscriptParser } from '../../src/parsers/transcriptParser';

describe('ModelParser', () => {
  it('should normalize known Antigravity model IDs into human-readable labels', () => {
    expect(ModelParser.normalizeModelName('gemini-3.8-flash-high')).toBe('Gemini 3.8 Flash (High)');
    expect(ModelParser.normalizeModelName('claude-sonnet-4-6')).toBe('Claude Sonnet 4.6 (Thinking)');
  });

  it('should parse output from agy models CLI command', () => {
    const cliOutput = `
Fetching available models...
gemini-3.8-flash-high\tGemini 3.8 Flash (High)
claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)
    `;
    const models = ModelParser.parseAgyModelsOutput(cliOutput);
    expect(models.length).toBe(2);
    expect(models[0].id).toBe('gemini-3.8-flash-high');
    expect(models[0].name).toBe('Gemini 3.8 Flash (High)');
    expect(models[0].family).toBe('gemini');
  });
});

describe('StatusParser', () => {
  it('should format countdown strings correctly', () => {
    const future = new Date(Date.now() + 3 * 3600 * 1000 + 15 * 60 * 1000).toISOString();
    const formatted = StatusParser.formatCountdown(future);
    expect(formatted).toMatch(/03h 1[45]m/);
  });

  it('should normalize usage snapshot safely', () => {
    const snapshot = StatusParser.normalizeSnapshot({
      model: 'gemini-3.8-flash-high',
      contextTokens: 250000,
      contextWindow: 1000000
    });
    expect(snapshot.model).toBe('Gemini 3.8 Flash (High)');
    expect(snapshot.contextPercentage).toBe(25);
    expect(snapshot.agentState).toBe('IDLE');
  });
});

describe('TranscriptParser', () => {
  it('should extract cleaned user request and model setting changes from transcript lines', () => {
    const line = JSON.stringify({
      step_index: 0,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: '2026-10-02T14:46:30Z',
      content:
        '<USER_REQUEST>\nread the md plan and proceed with the implementation\n</USER_REQUEST>\n<USER_SETTINGS_CHANGE>\nThe user changed setting `Model Selection` from None to Gemini 3.8 Flash (High).\n</USER_SETTINGS_CHANGE>'
    });

    const parsed = TranscriptParser.parseJsonLine(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.cleanedUserPrompt).toBe('read the md plan and proceed with the implementation');
    expect(parsed?.detectedModel).toBe('Gemini 3.8 Flash (High)');
  });
});
