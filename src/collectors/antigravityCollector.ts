import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AntigravityUsageSnapshot } from '../types/usage';
import { ModelParser, ModelInfo } from '../parsers/modelParser';
import { StatusParser } from '../parsers/statusParser';

const execAsync = promisify(exec);

export interface AntigravityPaths {
  homeDir: string;
  geminiDir: string;
  cliDir: string;
  appDir: string;
  ideDir: string;
  agyBinary?: string;
}

export class AntigravityCollector {
  private paths: AntigravityPaths;
  private cachedModels: ModelInfo[] = [];

  constructor() {
    const home = os.homedir();
    const gemini = path.join(home, '.gemini');
    this.paths = {
      homeDir: home,
      geminiDir: gemini,
      cliDir: path.join(gemini, 'antigravity-cli'),
      appDir: path.join(gemini, 'antigravity'),
      ideDir: path.join(gemini, 'antigravity-ide'),
      agyBinary: this.findAgyBinary(home)
    };
  }

  private findAgyBinary(home: string): string | undefined {
    const candidates = [
      path.join(home, 'AppData', 'Local', 'agy', 'bin', 'agy.exe'),
      path.join(home, '.gemini', 'bin', 'agy.exe'),
      'agy.exe',
      'agy'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return 'agy';
  }

  public getPaths(): AntigravityPaths {
    return this.paths;
  }

  public isAvailable(): boolean {
    return (
      fs.existsSync(this.paths.cliDir) ||
      fs.existsSync(this.paths.appDir) ||
      fs.existsSync(this.paths.ideDir)
    );
  }

  public getActiveConversationId(): string | undefined {
    // Check presence locks in ~/.gemini/antigravity-cli/presence
    const presenceDir = path.join(this.paths.cliDir, 'presence');
    if (fs.existsSync(presenceDir)) {
      try {
        const files = fs.readdirSync(presenceDir);
        const locks = files
          .filter((f) => f.endsWith('.lock'))
          .map((f) => {
            const stat = fs.statSync(path.join(presenceDir, f));
            return { id: f.replace('.lock', ''), mtime: stat.mtimeMs };
          })
          .sort((a, b) => b.mtime - a.mtime);

        if (locks.length > 0) {
          return locks[0].id;
        }
      } catch {}
    }

    // Fallback: check latest conversation in brain directory
    const brainDir = path.join(this.paths.cliDir, 'brain');
    if (fs.existsSync(brainDir)) {
      try {
        const dirs = fs.readdirSync(brainDir);
        const sorted = dirs
          .map((d) => {
            const fullPath = path.join(brainDir, d);
            try {
              const stat = fs.statSync(fullPath);
              return { id: d, mtime: stat.mtimeMs };
            } catch {
              return { id: d, mtime: 0 };
            }
          })
          .sort((a, b) => b.mtime - a.mtime);

        if (sorted.length > 0) {
          return sorted[0].id;
        }
      } catch {}
    }

    return undefined;
  }

  public async fetchAvailableModels(): Promise<ModelInfo[]> {
    if (this.cachedModels.length > 0) {
      return this.cachedModels;
    }

    try {
      const bin = this.paths.agyBinary || 'agy';
      const { stdout } = await execAsync(`"${bin}" models`, { timeout: 8000 });
      const parsed = ModelParser.parseAgyModelsOutput(stdout);
      if (parsed.length > 0) {
        this.cachedModels = parsed;
        return parsed;
      }
    } catch {
      // CLI might not be running or logged in, return standard models
    }

    this.cachedModels = [
      { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High)', family: 'gemini', contextWindow: 1000000 },
      { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium)', family: 'gemini', contextWindow: 1000000 },
      { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', family: 'gemini', contextWindow: 1000000 },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)', family: 'claude', contextWindow: 200000 },
      { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 (Thinking)', family: 'claude', contextWindow: 200000 }
    ];
    return this.cachedModels;
  }

  public getTranscriptPath(conversationId: string): string | undefined {
    const candidates = [
      path.join(this.paths.cliDir, 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl'),
      path.join(this.paths.appDir, 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl'),
      path.join(this.paths.ideDir, 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl')
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return undefined;
  }

  public getAllConversationIds(): string[] {
    const ids = new Set<string>();
    for (const base of [this.paths.cliDir, this.paths.appDir]) {
      const brainDir = path.join(base, 'brain');
      if (fs.existsSync(brainDir)) {
        try {
          const dirs = fs.readdirSync(brainDir);
          for (const d of dirs) {
            if (fs.existsSync(path.join(brainDir, d, '.system_generated', 'logs', 'transcript.jsonl'))) {
              ids.add(d);
            }
          }
        } catch {}
      }
    }
    return Array.from(ids);
  }
}
