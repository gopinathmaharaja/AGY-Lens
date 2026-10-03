export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'cli',
  workspace TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  agent_state TEXT NOT NULL DEFAULT 'IDLE',
  title TEXT NOT NULL DEFAULT '',
  step_count INTEGER NOT NULL DEFAULT 0,
  user_prompt_count INTEGER NOT NULL DEFAULT 0,
  total_estimated_input_tokens INTEGER DEFAULT 0,
  total_estimated_output_tokens INTEGER DEFAULT 0,
  last_synced_step INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'cli',
  step_index INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  prompt_score REAL NOT NULL DEFAULT 0,
  clarity_score REAL DEFAULT 0,
  context_score REAL DEFAULT 0,
  requirements_score REAL DEFAULT 0,
  constraints_score REAL DEFAULT 0,
  expected_output_score REAL DEFAULT 0,
  acceptance_criteria_score REAL DEFAULT 0,
  scope_score REAL DEFAULT 0,
  missing_items TEXT DEFAULT '',
  estimated_input_tokens INTEGER DEFAULT 0,
  estimated_output_tokens INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usage_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'cli',
  snapshot_at TEXT NOT NULL,
  cumulative_input_tokens INTEGER NOT NULL DEFAULT 0,
  cumulative_output_tokens INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  model TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS quota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,
  remaining REAL,
  reset_time TEXT,
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'observed'
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id INTEGER,
  recommended_model TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_conv ON sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_source ON sessions(source);
CREATE INDEX IF NOT EXISTS idx_prompts_timestamp ON prompts(timestamp);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_session ON prompts(session_id);
CREATE INDEX IF NOT EXISTS idx_prompts_session_step ON prompts(session_id, step_index);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_session ON usage_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_quota_timestamp ON quota(timestamp);
`;

/**
 * Migration SQL to run on existing databases.
 * Uses ALTER TABLE ADD COLUMN which is safe to re-run (will fail silently if column exists).
 */
export const MIGRATION_SQL = `
-- Drop old usage table if it exists (was producing duplicated records)
DROP TABLE IF EXISTS usage;
`;

/**
 * Safe column additions — each wrapped in try/catch at runtime since
 * SQLite doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN.
 */
export const COLUMN_MIGRATIONS: string[] = [
  `ALTER TABLE sessions ADD COLUMN source TEXT NOT NULL DEFAULT 'cli'`,
  `ALTER TABLE sessions ADD COLUMN user_prompt_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE sessions ADD COLUMN total_estimated_input_tokens INTEGER DEFAULT 0`,
  `ALTER TABLE sessions ADD COLUMN total_estimated_output_tokens INTEGER DEFAULT 0`,
  `ALTER TABLE sessions ADD COLUMN last_synced_step INTEGER DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN source TEXT NOT NULL DEFAULT 'cli'`,
  `ALTER TABLE prompts ADD COLUMN step_index INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN requirements_score REAL DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN constraints_score REAL DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN expected_output_score REAL DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN acceptance_criteria_score REAL DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN scope_score REAL DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN estimated_input_tokens INTEGER DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN estimated_output_tokens INTEGER DEFAULT 0`,
  `ALTER TABLE prompts ADD COLUMN word_count INTEGER DEFAULT 0`,
];
