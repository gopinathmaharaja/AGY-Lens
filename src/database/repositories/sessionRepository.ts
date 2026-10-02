import { IDatabase } from '../database';
import { SessionRecord } from '../../types/usage';

export class SessionRepository {
  constructor(private db: IDatabase) {}

  public upsert(session: SessionRecord): void {
    const existing = this.db.get<{ id: number }>('SELECT id FROM sessions WHERE conversation_id = ?', [
      session.conversation_id
    ]);

    if (existing) {
      this.db.run(
        `UPDATE sessions SET
          workspace = ?,
          model = ?,
          ended_at = ?,
          agent_state = ?,
          title = ?,
          step_count = ?
        WHERE conversation_id = ?`,
        [
          session.workspace,
          session.model,
          session.ended_at || null,
          session.agent_state,
          session.title || '',
          session.step_count,
          session.conversation_id
        ]
      );
    } else {
      this.db.run(
        `INSERT INTO sessions (
          conversation_id, workspace, model, started_at, ended_at, agent_state, title, step_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.conversation_id,
          session.workspace,
          session.model,
          session.started_at,
          session.ended_at || null,
          session.agent_state,
          session.title || '',
          session.step_count
        ]
      );
    }
  }

  public getByConversationId(conversationId: string): SessionRecord | undefined {
    return this.db.get<SessionRecord>('SELECT * FROM sessions WHERE conversation_id = ?', [conversationId]);
  }

  public getRecent(limit: number = 20): SessionRecord[] {
    return this.db.all<SessionRecord>('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?', [limit]);
  }

  public count(): number {
    const row = this.db.get<{ count: number }>('SELECT count(*) as count FROM sessions');
    return row?.count || 0;
  }
}
