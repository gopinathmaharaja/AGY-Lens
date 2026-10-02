export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT UNIQUE NOT NULL,
  workspace TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  agent_state TEXT NOT NULL DEFAULT 'IDLE',
  title TEXT NOT NULL DEFAULT '',
  step_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  prompt TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  prompt_score REAL NOT NULL DEFAULT 0,
  clarity_score REAL DEFAULT 0,
  context_score REAL DEFAULT 0,
  missing_items TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  timestamp TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  context_tokens INTEGER NOT NULL DEFAULT 0,
  context_window INTEGER NOT NULL DEFAULT 1000000,
  model TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS quota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,
  remaining REAL,
  reset_time TEXT,
  timestamp TEXT NOT NULL,
  is_estimate INTEGER NOT NULL DEFAULT 0
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
CREATE INDEX IF NOT EXISTS idx_prompts_timestamp ON prompts(timestamp);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_quota_timestamp ON quota(timestamp);
`;
