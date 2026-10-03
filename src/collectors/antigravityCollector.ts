import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AntigravityUsageSnapshot, ConversationRef, AntigravitySource } from '../types/usage';
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

  public getCurrentModel(): string {
    const settingsFiles = [
      path.join(this.paths.cliDir, 'settings.json'),
      path.join(this.paths.appDir, 'settings.json')
    ];

    for (const sf of settingsFiles) {
      if (fs.existsSync(sf)) {
        try {
          const content = fs.readFileSync(sf, 'utf-8');
          const data = JSON.parse(content);
          if (typeof data.model === 'string' && data.model.trim()) {
            return data.model.trim();
          }
        } catch {}
      }
    }
    return 'Gemini 3.8 Flash (High)';
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

    // Fallback: check latest conversation across all brain directories by mtime
    const allConvs = this.getAllConversations();
    let latestId: string | undefined;
    let latestMtime = 0;

    for (const conv of allConvs) {
      const convPath = path.join(conv.brainDir, conv.id);
      try {
        const stat = fs.statSync(convPath);
        if (stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
          latestId = conv.id;
        }
      } catch {}
    }

    return latestId;
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
    const locations = [
      { base: this.paths.cliDir },
      { base: this.paths.appDir },
      { base: this.paths.ideDir }
    ];

    for (const loc of locations) {
      // Prefer transcript_full.jsonl over transcript.jsonl for complete content
      const fullPath = path.join(loc.base, 'brain', conversationId, '.system_generated', 'logs', 'transcript_full.jsonl');
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
      const compactPath = path.join(loc.base, 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(compactPath)) {
        return compactPath;
      }
    }
    return undefined;
  }

  public getAllConversations(): ConversationRef[] {
    const results: ConversationRef[] = [];
    const seenIds = new Set<string>();

    const sources: { dir: string; source: AntigravitySource }[] = [
      { dir: this.paths.cliDir, source: 'cli' },
      { dir: this.paths.appDir, source: 'app' },
      { dir: this.paths.ideDir, source: 'ide' }
    ];

    for (const { dir, source } of sources) {
      const brainDir = path.join(dir, 'brain');
      if (fs.existsSync(brainDir)) {
        try {
          const entries = fs.readdirSync(brainDir);
          for (const d of entries) {
            if (seenIds.has(d)) continue;
            const logsDir = path.join(brainDir, d, '.system_generated', 'logs');
            const hasFull = fs.existsSync(path.join(logsDir, 'transcript_full.jsonl'));
            const hasCompact = fs.existsSync(path.join(logsDir, 'transcript.jsonl'));
            if (hasFull || hasCompact) {
              seenIds.add(d);
              results.push({
                id: d,
                source,
                brainDir
              });
            }
          }
        } catch {}
      }
    }

    return results;
  }

  public getAllConversationIds(): string[] {
    return this.getAllConversations().map((c) => c.id);
  }

  public getSourceForConversation(conversationId: string): AntigravitySource {
    const convs = this.getAllConversations();
    const found = convs.find((c) => c.id === conversationId);
    return found ? found.source : 'cli';
  }
}
