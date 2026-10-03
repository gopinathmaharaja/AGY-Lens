import { IDatabase } from '../database';
import { SessionRecord, AntigravitySource } from '../../types/usage';

export class SessionRepository {
  constructor(private db: IDatabase) {}

  public upsert(session: SessionRecord): void {
    const existing = this.db.get<{ id: number }>('SELECT id FROM sessions WHERE conversation_id = ?', [
      session.conversation_id
    ]);

    const source: AntigravitySource = session.source || 'cli';

    if (existing) {
      this.db.run(
        `UPDATE sessions SET
          source = ?,
          workspace = ?,
          model = ?,
          ended_at = ?,
          agent_state = ?,
          title = ?,
          step_count = ?,
          user_prompt_count = ?,
          total_estimated_input_tokens = ?,
          total_estimated_output_tokens = ?,
          last_synced_step = ?
        WHERE conversation_id = ?`,
        [
          source,
          session.workspace,
          session.model,
          session.ended_at || null,
          session.agent_state,
          session.title || '',
          session.step_count,
          session.user_prompt_count || 0,
          session.total_estimated_input_tokens || 0,
          session.total_estimated_output_tokens || 0,
          session.last_synced_step || 0,
          session.conversation_id
        ]
      );
    } else {
      this.db.run(
        `INSERT INTO sessions (
          conversation_id, source, workspace, model, started_at, ended_at, agent_state, title,
          step_count, user_prompt_count, total_estimated_input_tokens, total_estimated_output_tokens, last_synced_step
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.conversation_id,
          source,
          session.workspace,
          session.model,
          session.started_at,
          session.ended_at || null,
          session.agent_state,
          session.title || '',
          session.step_count,
          session.user_prompt_count || 0,
          session.total_estimated_input_tokens || 0,
          session.total_estimated_output_tokens || 0,
          session.last_synced_step || 0
        ]
      );
    }
  }

  public getByConversationId(conversationId: string): SessionRecord | undefined {
    return this.db.get<SessionRecord>('SELECT * FROM sessions WHERE conversation_id = ?', [conversationId]);
  }

  public getRecent(limit: number = 50): SessionRecord[] {
    return this.db.all<SessionRecord>('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?', [limit]);
  }

  public getBySource(source: AntigravitySource): SessionRecord[] {
    return this.db.all<SessionRecord>('SELECT * FROM sessions WHERE source = ? ORDER BY started_at DESC', [source]);
  }

  public count(): number {
    const row = this.db.get<{ count: number }>('SELECT count(*) as count FROM sessions');
    return row?.count || 0;
  }
}
