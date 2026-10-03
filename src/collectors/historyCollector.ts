import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HistoryEntry } from '../types/usage';

export class HistoryCollector {
  private historyPath: string;

  constructor() {
    this.historyPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'history.jsonl');
  }

  public getHistoryPath(): string {
    return this.historyPath;
  }

  public isAvailable(): boolean {
    return fs.existsSync(this.historyPath);
  }

  public collect(): HistoryEntry[] {
    if (!fs.existsSync(this.historyPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.historyPath, 'utf-8');
      const lines = content.split('\n');
      const entries: HistoryEntry[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed.display === 'string') {
            entries.push({
              display: parsed.display,
              timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
              workspace: parsed.workspace || '',
              conversationId: parsed.conversationId,
              type: parsed.type
            });
          }
        } catch {
          // Skip malformed line
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  public getPromptEntries(): HistoryEntry[] {
    return this.collect().filter((e) => e.type !== 'slash_command');
  }
}
