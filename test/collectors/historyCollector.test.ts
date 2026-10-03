import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HistoryCollector } from '../../src/collectors/historyCollector';

describe('HistoryCollector', () => {
  it('should initialize and check availability gracefully', () => {
    const collector = new HistoryCollector();
    expect(collector.getHistoryPath()).toContain('history.jsonl');
    expect(typeof collector.isAvailable()).toBe('boolean');
    const entries = collector.collect();
    expect(Array.isArray(entries)).toBe(true);
  });

  it('should filter out slash commands in getPromptEntries', () => {
    const collector = new HistoryCollector();
    const promptEntries = collector.getPromptEntries();
    expect(Array.isArray(promptEntries)).toBe(true);
    for (const entry of promptEntries) {
      expect(entry.type).not.toBe('slash_command');
      expect(typeof entry.display).toBe('string');
    }
  });
});
