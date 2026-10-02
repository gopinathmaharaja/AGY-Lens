import { IDatabase } from '../database';
import { PromptRecord } from '../../types/usage';

export class PromptRepository {
  constructor(private db: IDatabase) {}

  public insert(prompt: PromptRecord): number | undefined {
    const res = this.db.run(
      `INSERT INTO prompts (
        session_id, prompt, timestamp, category, prompt_score, clarity_score, context_score, missing_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prompt.session_id || null,
        prompt.prompt,
        prompt.timestamp,
        prompt.category,
        prompt.prompt_score,
        prompt.clarity_score || 0,
        prompt.context_score || 0,
        prompt.missing_items || ''
      ]
    );
    return res.lastInsertRowid;
  }

  public getRecent(limit: number = 50): PromptRecord[] {
    return this.db.all<PromptRecord>('SELECT * FROM prompts ORDER BY timestamp DESC LIMIT ?', [limit]);
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

  public count(): number {
    const row = this.db.get<{ count: number }>('SELECT count(*) as count FROM prompts');
    return row?.count || 0;
  }
}
