import { IDatabase } from '../database';
import { UsageRecord, DailyUsageSummary, ModelUsageSummary } from '../../types/usage';

export class UsageRepository {
  constructor(private db: IDatabase) {}

  public insert(usage: UsageRecord): number | undefined {
    const res = this.db.run(
      `INSERT INTO usage (
        session_id, timestamp, input_tokens, output_tokens, cache_read_tokens, context_tokens, context_window, model
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usage.session_id || null,
        usage.timestamp,
        usage.input_tokens,
        usage.output_tokens,
        usage.cache_read_tokens,
        usage.context_tokens,
        usage.context_window,
        usage.model || ''
      ]
    );
    return res.lastInsertRowid;
  }

  public getDailyUsage(days: number = 7): DailyUsageSummary[] {
    const rows = this.db.all<any>(
      `SELECT
        substr(timestamp, 1, 10) as date,
        count(*) as requestCount,
        sum(input_tokens) as inputTokens,
        sum(output_tokens) as outputTokens,
        sum(cache_read_tokens) as cacheReadTokens,
        sum(input_tokens + output_tokens) as totalTokens,
        round(avg(input_tokens + output_tokens)) as avgTokensPerRequest,
        round(avg((context_tokens * 100.0) / CASE WHEN context_window <= 0 THEN 1000000 ELSE context_window END)) as avgContextPercentage
      FROM usage
      GROUP BY substr(timestamp, 1, 10)
      ORDER BY date DESC
      LIMIT ?`,
      [days]
    );

    return rows.map((r) => ({
      date: r.date,
      requestCount: r.requestCount || 0,
      inputTokens: r.inputTokens || 0,
      outputTokens: r.outputTokens || 0,
      cacheReadTokens: r.cacheReadTokens || 0,
      totalTokens: r.totalTokens || 0,
      avgTokensPerRequest: r.avgTokensPerRequest || 0,
      avgContextPercentage: r.avgContextPercentage || 0,
      avgPromptScore: 0
    }));
  }

  public getModelUsage(): ModelUsageSummary[] {
    const totalRow = this.db.get<{ total: number }>('SELECT count(*) as total FROM usage');
    const total = totalRow?.total || 1;

    const rows = this.db.all<any>(
      `SELECT
        CASE WHEN model IS NULL OR model = '' THEN 'Gemini 3.8 Flash (High)' ELSE model END as model,
        count(*) as requestCount,
        sum(input_tokens) as inputTokens,
        sum(output_tokens) as outputTokens
      FROM usage
      GROUP BY model
      ORDER BY requestCount DESC`
    );

    return rows.map((r) => ({
      model: r.model,
      requestCount: r.requestCount,
      percentage: Math.round((r.requestCount / total) * 100),
      inputTokens: r.inputTokens || 0,
      outputTokens: r.outputTokens || 0
    }));
  }

  public getTodaySummary(): { requests: number; tokens: number; avgContext: number } {
    const todayStr = new Date().toISOString().slice(0, 10);
    const row = this.db.get<any>(
      `SELECT
        count(*) as requests,
        sum(input_tokens + output_tokens) as tokens,
        round(avg((context_tokens * 100.0) / CASE WHEN context_window <= 0 THEN 1000000 ELSE context_window END)) as avgContext
      FROM usage
      WHERE substr(timestamp, 1, 10) = ?`,
      [todayStr]
    );

    return {
      requests: row?.requests || 0,
      tokens: row?.tokens || 0,
      avgContext: row?.avgContext || 0
    };
  }

  public getTotalTokens(): number {
    const row = this.db.get<{ total: number }>('SELECT sum(input_tokens + output_tokens) as total FROM usage');
    return row?.total || 0;
  }
}
