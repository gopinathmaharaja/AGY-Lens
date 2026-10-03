import { IDatabase } from '../database';
import { PromptRecord, AntigravitySource } from '../../types/usage';

export class PromptRepository {
  constructor(private db: IDatabase) {}

  public exists(sessionId: string, stepIndex?: number): boolean {
    const idx = typeof stepIndex === 'number' ? stepIndex : 0;
    const row = this.db.get<{ id: number }>(
      'SELECT id FROM prompts WHERE session_id = ? AND step_index = ? LIMIT 1',
      [sessionId, idx]
    );
    return !!row;
  }

  public insert(prompt: PromptRecord): number | undefined {
    let stepIndex = prompt.step_index;
    if (typeof stepIndex !== 'number') {
      stepIndex = this.countBySession(prompt.session_id || '');
    }

    // If prompt already exists for this session and step, don't duplicate
    if (prompt.session_id && this.exists(prompt.session_id, stepIndex)) {
      return undefined;
    }

    const source: AntigravitySource = prompt.source || 'cli';

    const res = this.db.run(
      `INSERT INTO prompts (
        session_id, source, step_index, prompt, timestamp, category, prompt_score,
        clarity_score, context_score, requirements_score, constraints_score,
        expected_output_score, acceptance_criteria_score, scope_score,
        missing_items, estimated_input_tokens, estimated_output_tokens, word_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prompt.session_id || null,
        source,
        stepIndex,
        prompt.prompt || '',
        prompt.timestamp || new Date().toISOString(),
        prompt.category || 'Other',
        prompt.prompt_score || 0,
        prompt.clarity_score || 0,
        prompt.context_score || 0,
        prompt.requirements_score || 0,
        prompt.constraints_score || 0,
        prompt.expected_output_score || 0,
        prompt.acceptance_criteria_score || 0,
        prompt.scope_score || 0,
        prompt.missing_items || '',
        prompt.estimated_input_tokens || 0,
        prompt.estimated_output_tokens || 0,
        prompt.word_count || 0
      ]
    );
    return res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined;
  }

  public getRecent(limit: number = 100): PromptRecord[] {
    return this.db.all<PromptRecord>('SELECT * FROM prompts ORDER BY timestamp DESC LIMIT ?', [limit]);
  }

  public getBySessionId(sessionId: string): PromptRecord[] {
    return this.db.all<PromptRecord>('SELECT * FROM prompts WHERE session_id = ? ORDER BY step_index ASC', [sessionId]);
  }

  public getBySource(source: AntigravitySource, limit: number = 100): PromptRecord[] {
    return this.db.all<PromptRecord>('SELECT * FROM prompts WHERE source = ? ORDER BY timestamp DESC LIMIT ?', [source, limit]);
  }

  public getCategoryDistribution(): { category: string; count: number }[] {
    return this.db.all<{ category: string; count: number }>(
      'SELECT category, count(*) as count FROM prompts GROUP BY category ORDER BY count DESC'
    );
  }

  public getAverageScore(): number {
    const row = this.db.get<{ avg_score: number }>('SELECT AVG(prompt_score) as avg_score FROM prompts');
    return row && row.avg_score ? Math.round(row.avg_score) : 0;
  }

  public getTotalEstimatedTokens(): { inputTokens: number; outputTokens: number; totalTokens: number } {
    const row = this.db.get<{ input: number; output: number }>(
      'SELECT sum(estimated_input_tokens) as input, sum(estimated_output_tokens) as output FROM prompts'
    );
    const inputTokens = row?.input || 0;
    const outputTokens = row?.output || 0;
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    };
  }

  public count(): number {
    const row = this.db.get<{ count: number }>('SELECT count(*) as count FROM prompts');
    return row?.count || 0;
  }

  public countBySession(sessionId: string): number {
    const row = this.db.get<{ count: number }>('SELECT count(*) as count FROM prompts WHERE session_id = ?', [sessionId]);
    return row?.count || 0;
  }

  public getExpensivePrompts(threshold: number = 20000, limit: number = 10): PromptRecord[] {
    return this.db.all<PromptRecord>(
      `SELECT * FROM prompts
       WHERE (estimated_input_tokens + estimated_output_tokens) >= ?
       ORDER BY (estimated_input_tokens + estimated_output_tokens) DESC
       LIMIT ?`,
      [threshold, limit]
    );
  }

  public searchPrompts(query?: string, source?: string, category?: string, limit: number = 100): PromptRecord[] {
    let sql = 'SELECT * FROM prompts WHERE 1=1';
    const params: any[] = [];

    if (query && query.trim()) {
      sql += ' AND prompt LIKE ?';
      params.push(`%${query.trim()}%`);
    }
    if (source && source !== 'all') {
      sql += ' AND source = ?';
      params.push(source);
    }
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return this.db.all<PromptRecord>(sql, params);
  }
}
