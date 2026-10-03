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
    const prompts = this.promptRepo.getRecent(10000);
    const sessions = this.sessionRepo.getRecent(1000);
    const sessionMap = new Map<string, { model: string; workspace: string }>();
    for (const s of sessions) {
      sessionMap.set(s.conversation_id, { model: s.model || '', workspace: s.workspace || '' });
    }

    const headers = [
      'timestamp',
      'source',
      'prompt',
      'category',
      'score',
      'input_tokens',
      'output_tokens',
      'total_tokens',
      'model',
      'workspace'
    ];
    const lines = [headers.join(',')];

    for (const p of prompts) {
      const meta = sessionMap.get(p.session_id || '') || { model: '', workspace: '' };
      const safePrompt = '"' + (p.prompt || '').replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
      const safeWorkspace = '"' + (meta.workspace || '').replace(/"/g, '""') + '"';
      const inputTk = p.estimated_input_tokens || 0;
      const outputTk = p.estimated_output_tokens || 0;
      const totalTk = inputTk + outputTk;

      lines.push(
        [
          p.timestamp || '',
          p.source || 'cli',
          safePrompt,
          p.category || 'Other',
          p.prompt_score || 0,
          inputTk,
          outputTk,
          totalTk,
          meta.model,
          safeWorkspace
        ].join(',')
      );
    }

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  }

  public async exportToMarkdown(outputPath: string): Promise<void> {
    const todaySummary = this.usageRepo.getTodaySummary();
    const weekSummary = this.usageRepo.getWeekSummary();
    const dailyUsage = this.usageRepo.getDailyUsage(14);
    const modelUsage = this.usageRepo.getModelUsage();
    const usageBySource = this.usageRepo.getUsageBySource();
    const expensivePrompts = this.promptRepo.getExpensivePrompts(20000, 5);

    let md = `# Antigravity Usage Intelligence Report\n\n`;
    md += `*Generated: ${new Date().toLocaleString()}*\n\n`;
    md += `## 1. Executive Summary\n\n`;
    md += `- **Today's Tokens:** ${(todaySummary.tokens || 0).toLocaleString()} across ${todaySummary.requests || 0} prompts\n`;
    md += `- **This Week's Tokens:** ${(weekSummary.tokens || 0).toLocaleString()} across ${weekSummary.requests || 0} prompts\n`;
    md += `- **Average Prompt Score:** ${this.promptRepo.getAverageScore()}/100\n\n`;

    md += `## 2. Multi-Source Distribution\n\n`;
    md += `| Source | Prompts | Input Tokens | Output Tokens | Total Tokens |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const s of usageBySource) {
      const label = s.source === 'ide' ? '💻 IDE' : s.source === 'app' ? '🖥️ Desktop App' : '📟 Terminal CLI';
      md += `| ${label} | ${s.promptCount} | ${s.inputTokens.toLocaleString()} | ${s.outputTokens.toLocaleString()} | **${s.totalTokens.toLocaleString()}** |\n`;
    }

    md += `\n## 3. Models Usage\n\n`;
    md += `| Model | Requests | Percentage | Input Tokens | Output Tokens |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const m of modelUsage) {
      md += `| ${m.model} | ${m.requestCount} | ${m.percentage}% | ${m.inputTokens.toLocaleString()} | ${m.outputTokens.toLocaleString()} |\n`;
    }

    if (expensivePrompts.length > 0) {
      md += `\n## 4. Top Token-Heavy Invocations\n\n`;
      md += `| Source | Prompt (Excerpt) | Category | Est. Tokens |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const p of expensivePrompts) {
        const total = (p.estimated_input_tokens || 0) + (p.estimated_output_tokens || 0);
        const excerpt = p.prompt.length > 60 ? p.prompt.slice(0, 57) + '...' : p.prompt;
        md += `| ${p.source?.toUpperCase() || 'CLI'} | ${excerpt.replace(/\|/g, '\\|')} | ${p.category} | **${total.toLocaleString()} tk** |\n`;
      }
    }

    md += `\n## 5. Daily Usage (Last 14 Days)\n\n`;
    md += `| Date | Prompts | Input Tokens | Output Tokens | Total Tokens | Avg Cost/Prompt |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const d of dailyUsage) {
      md += `| ${d.date} | ${d.requestCount} | ${d.inputTokens.toLocaleString()} | ${d.outputTokens.toLocaleString()} | **${d.totalTokens.toLocaleString()}** | ${d.avgTokensPerRequest?.toLocaleString() || 0} tk |\n`;
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
