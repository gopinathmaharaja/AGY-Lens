import { IDatabase } from '../database';
import { QuotaRecord } from '../../types/usage';

export class QuotaRepository {
  constructor(private db: IDatabase) {}

  public recordQuota(record: QuotaRecord): void {
    // Only record if we actually have a measured value
    if (record.remaining === null && record.reset_time === null) {
      return;
    }

    this.db.run(
      `INSERT INTO quota (model, remaining, reset_time, timestamp, source)
       VALUES (?, ?, ?, ?, ?)`,
      [record.model, record.remaining, record.reset_time, record.timestamp, record.source || 'observed']
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
