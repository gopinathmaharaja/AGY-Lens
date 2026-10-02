import { IDatabase } from '../database';
import { InsightRecord } from '../../types/usage';

export class InsightRepository {
  constructor(private db: IDatabase) {}

  public addInsight(insight: InsightRecord): number | undefined {
    const res = this.db.run(
      `INSERT INTO insights (type, title, description, severity, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [insight.type, insight.title, insight.description, insight.severity, insight.created_at]
    );
    return res.lastInsertRowid;
  }

  public getRecent(limit: number = 20): InsightRecord[] {
    return this.db.all<InsightRecord>('SELECT * FROM insights ORDER BY created_at DESC LIMIT ?', [limit]);
  }
}
