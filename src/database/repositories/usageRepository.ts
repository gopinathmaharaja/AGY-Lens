import { IDatabase } from '../database';
import { UsageSnapshotRecord, DailyUsageSummary, ModelUsageSummary, AntigravitySource } from '../../types/usage';

export class UsageRepository {
  constructor(private db: IDatabase) {}

  /**
   * Upsert a snapshot for a session.
   * Prevents creating duplicate rows every sync interval.
   */
  public upsertSnapshot(snapshot: UsageSnapshotRecord): void {
    this.db.run(
      `INSERT INTO usage_snapshots (
        session_id, source, snapshot_at, cumulative_input_tokens, cumulative_output_tokens, step_count, model
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        source = excluded.source,
        snapshot_at = excluded.snapshot_at,
        cumulative_input_tokens = excluded.cumulative_input_tokens,
        cumulative_output_tokens = excluded.cumulative_output_tokens,
        step_count = excluded.step_count,
        model = excluded.model`,
      [
        snapshot.session_id,
        snapshot.source || 'cli',
        snapshot.snapshot_at,
        snapshot.cumulative_input_tokens || 0,
        snapshot.cumulative_output_tokens || 0,
        snapshot.step_count || 0,
        snapshot.model || ''
      ]
    );
  }

  /**
   * Backward-compatible insert method: upserts snapshot per session.
   */
  public insert(usage: any): number | undefined {
    if (usage.session_id) {
      this.upsertSnapshot({
        session_id: usage.session_id,
        source: usage.source || 'cli',
        snapshot_at: usage.timestamp || new Date().toISOString(),
        cumulative_input_tokens: usage.input_tokens || 0,
        cumulative_output_tokens: usage.output_tokens || 0,
        step_count: usage.step_count || 0,
        model: usage.model || ''
      });
    }
    return 1;
  }

  /**
   * Aggregates real daily usage.
   * Prefers granular per-prompt data if available; falls back to session snapshots.
   */
  public getDailyUsage(days: number = 7): DailyUsageSummary[] {
    const promptRows = this.db.all<any>(
      `SELECT
        substr(timestamp, 1, 10) as date,
        count(*) as requestCount,
        sum(estimated_input_tokens) as inputTokens,
        sum(estimated_output_tokens) as outputTokens,
        sum(estimated_input_tokens + estimated_output_tokens) as totalTokens,
        round(avg(estimated_input_tokens + estimated_output_tokens)) as avgTokensPerRequest,
        round(avg(prompt_score)) as avgPromptScore
      FROM prompts
      GROUP BY substr(timestamp, 1, 10)
      ORDER BY date DESC
      LIMIT ?`,
      [days]
    );

    const promptTokens = promptRows.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
    if (promptTokens > 0) {
      return promptRows.map((r) => ({
        date: r.date,
        requestCount: r.requestCount || 0,
        inputTokens: r.inputTokens || 0,
        outputTokens: r.outputTokens || 0,
        cacheReadTokens: 0,
        totalTokens: r.totalTokens || 0,
        avgTokensPerRequest: r.avgTokensPerRequest || 0,
        avgContextPercentage: 0,
        avgPromptScore: r.avgPromptScore || 0
      }));
    }

    // Fallback to usage_snapshots if prompts table has no token data yet
    const snapshotRows = this.db.all<any>(
      `SELECT
        substr(snapshot_at, 1, 10) as date,
        count(*) as requestCount,
        sum(cumulative_input_tokens) as inputTokens,
        sum(cumulative_output_tokens) as outputTokens,
        sum(cumulative_input_tokens + cumulative_output_tokens) as totalTokens,
        round(avg(cumulative_input_tokens + cumulative_output_tokens)) as avgTokensPerRequest
      FROM usage_snapshots
      GROUP BY substr(snapshot_at, 1, 10)
      ORDER BY date DESC
      LIMIT ?`,
      [days]
    );

    return snapshotRows.map((r) => ({
      date: r.date,
      requestCount: r.requestCount || 0,
      inputTokens: r.inputTokens || 0,
      outputTokens: r.outputTokens || 0,
      cacheReadTokens: 0,
      totalTokens: r.totalTokens || 0,
      avgTokensPerRequest: r.avgTokensPerRequest || 0,
      avgContextPercentage: 0,
      avgPromptScore: 0
    }));
  }

  /**
   * Model usage distribution from sessions table.
   */
  public getModelUsage(): ModelUsageSummary[] {
    const totalRow = this.db.get<{ total: number }>('SELECT count(*) as total FROM sessions');
    const total = totalRow?.total || 1;

    const rows = this.db.all<any>(
      `SELECT
        CASE WHEN model IS NULL OR model = '' THEN 'Unknown' ELSE model END as model,
        count(*) as sessionCount,
        sum(total_estimated_input_tokens) as inputTokens,
        sum(total_estimated_output_tokens) as outputTokens
      FROM sessions
      GROUP BY model
      ORDER BY sessionCount DESC`
    );

    return rows.map((r) => ({
      model: r.model,
      requestCount: r.sessionCount,
      percentage: Math.round((r.sessionCount / total) * 100),
      inputTokens: r.inputTokens || 0,
      outputTokens: r.outputTokens || 0
    }));
  }

  /**
   * Source usage breakdown: CLI vs App vs IDE.
   */
  public getUsageBySource(): { source: string; promptCount: number; inputTokens: number; outputTokens: number; totalTokens: number }[] {
    const rows = this.db.all<any>(
      `SELECT
        source,
        count(*) as promptCount,
        sum(estimated_input_tokens) as inputTokens,
        sum(estimated_output_tokens) as outputTokens,
        sum(estimated_input_tokens + estimated_output_tokens) as totalTokens
      FROM prompts
      GROUP BY source
      ORDER BY promptCount DESC`
    );

    return rows.map((r) => ({
      source: r.source || 'cli',
      promptCount: r.promptCount || 0,
      inputTokens: r.inputTokens || 0,
      outputTokens: r.outputTokens || 0,
      totalTokens: r.totalTokens || 0
    }));
  }

  public getTodaySummary(): { requests: number; tokens: number; avgContext: number } {
    const todayStr = new Date().toISOString().slice(0, 10);
    const row = this.db.get<any>(
      `SELECT
        count(*) as requests,
        sum(estimated_input_tokens + estimated_output_tokens) as tokens
      FROM prompts
      WHERE substr(timestamp, 1, 10) = ?`,
      [todayStr]
    );

    if (row && (row.tokens || 0) > 0) {
      return {
        requests: row.requests,
        tokens: row.tokens,
        avgContext: 0
      };
    }

    const snapRow = this.db.get<any>(
      `SELECT
        count(*) as requests,
        sum(cumulative_input_tokens + cumulative_output_tokens) as tokens
      FROM usage_snapshots
      WHERE substr(snapshot_at, 1, 10) = ?`,
      [todayStr]
    );

    return {
      requests: snapRow?.requests || 0,
      tokens: snapRow?.tokens || 0,
      avgContext: 0
    };
  }

  public getWeekSummary(): { requests: number; tokens: number } {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const row = this.db.get<any>(
      `SELECT
        count(*) as requests,
        sum(estimated_input_tokens + estimated_output_tokens) as tokens
      FROM prompts
      WHERE substr(timestamp, 1, 10) >= ?`,
      [sevenDaysAgo]
    );

    if (row && (row.tokens || 0) > 0) {
      return {
        requests: row.requests || 0,
        tokens: row.tokens || 0
      };
    }

    const snapRow = this.db.get<any>(
      `SELECT
        count(*) as requests,
        sum(cumulative_input_tokens + cumulative_output_tokens) as tokens
      FROM usage_snapshots
      WHERE substr(snapshot_at, 1, 10) >= ?`,
      [sevenDaysAgo]
    );

    return {
      requests: snapRow?.requests || 0,
      tokens: snapRow?.tokens || 0
    };
  }

  public getTokensByCategory(): { category: string; promptCount: number; inputTokens: number; outputTokens: number; totalTokens: number }[] {
    const rows = this.db.all<any>(
      `SELECT
        category,
        count(*) as promptCount,
        sum(estimated_input_tokens) as inputTokens,
        sum(estimated_output_tokens) as outputTokens,
        sum(estimated_input_tokens + estimated_output_tokens) as totalTokens
      FROM prompts
      GROUP BY category
      ORDER BY totalTokens DESC`
    );

    return rows.map((r) => ({
      category: r.category || 'Other',
      promptCount: r.promptCount || 0,
      inputTokens: r.inputTokens || 0,
      outputTokens: r.outputTokens || 0,
      totalTokens: r.totalTokens || 0
    }));
  }

  public getTotalTokens(): number {
    const row = this.db.get<{ total: number }>(
      'SELECT sum(estimated_input_tokens + estimated_output_tokens) as total FROM prompts'
    );
    if (row && row.total > 0) return row.total;

    const snapRow = this.db.get<{ total: number }>(
      'SELECT sum(cumulative_input_tokens + cumulative_output_tokens) as total FROM usage_snapshots'
    );
    return snapRow?.total || 0;
  }
}
