import { IDatabase } from '../database';
import { QuotaRecord } from '../../types/usage';

export class QuotaRepository {
  constructor(private db: IDatabase) {}

  public recordQuota(record: QuotaRecord): void {
    this.db.run(
      `INSERT INTO quota (model, remaining, reset_time, timestamp, is_estimate)
       VALUES (?, ?, ?, ?, ?)`,
      [record.model, record.remaining, record.reset_time, record.timestamp, record.is_estimate]
    );
  }

  public getLatest(model?: string): QuotaRecord | undefined {
    if (model) {
      return this.db.get<QuotaRecord>(
        'SELECT * FROM quota WHERE model = ? ORDER BY timestamp DESC LIMIT 1',
        [model]
      );
    }
    return this.db.get<QuotaRecord>('SELECT * FROM quota ORDER BY timestamp DESC LIMIT 1');
  }

  public getHistory(limit: number = 30): QuotaRecord[] {
    return this.db.all<QuotaRecord>('SELECT * FROM quota ORDER BY timestamp DESC LIMIT ?', [limit]);
  }
}
