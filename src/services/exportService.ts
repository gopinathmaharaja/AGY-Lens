import * as fs from 'fs';
import { PromptRepository } from '../database/repositories/promptRepository';
import { UsageRepository } from '../database/repositories/usageRepository';
import { SessionRepository } from '../database/repositories/sessionRepository';
import { SecretRedactor } from './secretRedactor';

export interface ExportDataPayload {
  version: string;
  exportedAt: string;
  sessions: any[];
  prompts: any[];
  usage: any[];
}

export class ExportService {
  constructor(
    private sessionRepo: SessionRepository,
    private promptRepo: PromptRepository,
    private usageRepo: UsageRepository
  ) {}

  public async exportToJson(
    outputPath: string,
    options: { includePrompts: boolean; redactSecrets: boolean } = { includePrompts: true, redactSecrets: true }
  ): Promise<void> {
    const sessions = this.sessionRepo.getRecent(1000);
    let prompts = options.includePrompts ? this.promptRepo.getRecent(5000) : [];
    const usage = this.usageRepo.getDailyUsage(365);

    if (options.redactSecrets && options.includePrompts) {
      prompts = prompts.map((p) => ({
        ...p,
        prompt: SecretRedactor.redact(p.prompt).redactedText
      }));
    }

    const payload: ExportDataPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      sessions,
      prompts,
      usage
    };

    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  public async exportToCsv(outputPath: string): Promise<void> {
    const usage = this.usageRepo.getDailyUsage(365);
    const headers = ['date', 'requestCount', 'inputTokens', 'outputTokens', 'cacheReadTokens', 'totalTokens', 'avgContextPercentage'];
    const lines = [headers.join(',')];

    for (const u of usage) {
      lines.push(
        [
          u.date,
          u.requestCount,
          u.inputTokens,
          u.outputTokens,
          u.cacheReadTokens,
          u.totalTokens,
          u.avgContextPercentage
        ].join(',')
      );
    }

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  }

  public async exportToMarkdown(outputPath: string): Promise<void> {
    const todaySummary = this.usageRepo.getTodaySummary();
    const dailyUsage = this.usageRepo.getDailyUsage(14);
    const modelUsage = this.usageRepo.getModelUsage();

    let md = `# Antigravity Usage Intelligence Report\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    md += `## Today's Overview\n\n`;
    md += `- **Requests:** ${todaySummary.requests}\n`;
    md += `- **Total Tokens:** ${todaySummary.tokens.toLocaleString()}\n`;
    md += `- **Average Context Usage:** ${todaySummary.avgContext}%\n\n`;

    md += `## Models Usage\n\n`;
    md += `| Model | Requests | Percentage | Input Tokens | Output Tokens |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const m of modelUsage) {
      md += `| ${m.model} | ${m.requestCount} | ${m.percentage}% | ${m.inputTokens.toLocaleString()} | ${m.outputTokens.toLocaleString()} |\n`;
    }

    md += `\n## Daily Usage (Last 14 Days)\n\n`;
    md += `| Date | Requests | Input Tokens | Output Tokens | Total Tokens |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const d of dailyUsage) {
      md += `| ${d.date} | ${d.requestCount} | ${d.inputTokens.toLocaleString()} | ${d.outputTokens.toLocaleString()} | ${d.totalTokens.toLocaleString()} |\n`;
    }

    fs.writeFileSync(outputPath, md, 'utf-8');
  }

  public async importFromJson(inputPath: string): Promise<{ sessionsImported: number; promptsImported: number }> {
    const raw = fs.readFileSync(inputPath, 'utf-8');
    const data: ExportDataPayload = JSON.parse(raw);

    let sessionsCount = 0;
    let promptsCount = 0;

    if (Array.isArray(data.sessions)) {
      for (const s of data.sessions) {
        this.sessionRepo.upsert(s);
        sessionsCount++;
      }
    }

    if (Array.isArray(data.prompts)) {
      for (const p of data.prompts) {
        this.promptRepo.insert(p);
        promptsCount++;
      }
    }

    return { sessionsImported: sessionsCount, promptsImported: promptsCount };
  }
}
