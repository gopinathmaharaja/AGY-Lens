import { z } from 'zod';

export type AntigravitySource = 'cli' | 'app' | 'ide';

export const AntigravityUsageSnapshotSchema = z.object({
  timestamp: z.string(),
  model: z.string().optional(),
  conversationId: z.string().optional(),
  transcriptPath: z.string().optional(),
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  cacheReadTokens: z.number().default(0),
  contextTokens: z.number().default(0),
  contextWindow: z.number().default(1000000),
  contextPercentage: z.number().default(0),
  quotaRemaining: z.number().nullable().optional(),
  quotaResetTime: z.string().nullable().optional(),
  workspace: z.string().optional(),
  planTier: z.string().optional(),
  agentState: z.string().optional(),
  isEstimate: z.boolean().default(false),
  todayTokens: z.number().default(0),
  todayPrompts: z.number().default(0),
  weekTokens: z.number().default(0),
  weekPrompts: z.number().default(0),
  turnCount: z.number().default(0)
});

export type AntigravityUsageSnapshot = z.infer<typeof AntigravityUsageSnapshotSchema>;

export type PromptCategory =
  | 'Development'
  | 'Debugging'
  | 'Architecture'
  | 'Code Review'
  | 'Testing'
  | 'Refactoring'
  | 'Database'
  | 'DevOps'
  | 'Documentation'
  | 'Research'
  | 'Learning'
  | 'Planning'
  | 'Other';

export interface PromptAnalysis {
  score: number;
  dimensionScores: {
    clarity: number; // max 20
    context: number; // max 15
    requirements: number; // max 15
    constraints: number; // max 15
    expectedOutput: number; // max 15
    acceptanceCriteria: number; // max 10
    scope: number; // max 10
  };
  missingItems: string[];
  strengths: string[];
  suggestions: string[];
  category: PromptCategory;
  isVague: boolean;
  redactedPrompt: string;
  detectedSecrets: string[];
}

export interface ModelRecommendation {
  recommendedModel: string;
  alternativeModels: string[];
  confidence: number;
  reasons: string[];
  taskComplexity: 'simple' | 'moderate' | 'complex';
}

export interface ConversationAnalysis {
  conversationId: string;
  efficiencyScore: number;
  turnCount: number;
  repeatedPromptsCount: number;
  repeatedCorrectionsCount: number;
  contextUsagePercent: number;
  isContextApproachingLimit: boolean;
  warnings: string[];
  suggestedAction?: string;
}

export interface SessionRecord {
  id?: number;
  conversation_id: string;
  source: AntigravitySource;
  workspace: string;
  model: string;
  started_at: string;
  ended_at?: string;
  agent_state: string;
  title?: string;
  step_count: number;
  user_prompt_count?: number;
  total_estimated_input_tokens?: number;
  total_estimated_output_tokens?: number;
  last_synced_step?: number;
}

export interface PromptRecord {
  id?: number;
  session_id: string;
  source: AntigravitySource;
  step_index: number;
  prompt: string;
  timestamp: string;
  category: string;
  prompt_score: number;
  clarity_score?: number;
  context_score?: number;
  requirements_score?: number;
  constraints_score?: number;
  expected_output_score?: number;
  acceptance_criteria_score?: number;
  scope_score?: number;
  missing_items?: string;
  estimated_input_tokens?: number;
  estimated_output_tokens?: number;
  word_count?: number;
}

export interface UsageSnapshotRecord {
  id?: number;
  session_id: string;
  source: AntigravitySource;
  snapshot_at: string;
  cumulative_input_tokens: number;
  cumulative_output_tokens: number;
  step_count: number;
  model?: string;
}

export interface QuotaRecord {
  id?: number;
  model: string;
  remaining: number;
  reset_time: string;
  timestamp: string;
  source: string;
}

export interface InsightRecord {
  id?: number;
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

export interface DailyUsageSummary {
  date: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  avgTokensPerRequest: number;
  avgContextPercentage: number;
  avgPromptScore: number;
}

export interface ModelUsageSummary {
  model: string;
  requestCount: number;
  percentage: number;
  inputTokens: number;
  outputTokens: number;
}

export interface PersonalProfileSummary {
  strengths: string[];
  improvementAreas: string[];
  topCategories: { category: string; count: number }[];
  avgPromptLength: number;
  avgPromptScore: number;
  totalPrompts: number;
  totalSessions: number;
  totalTokens: number;
  dimensionAverages?: {
    clarity: number;
    context: number;
    requirements: number;
    constraints: number;
    expectedOutput: number;
    acceptanceCriteria: number;
    scope: number;
  };
  scoreTrend?: { date: string; avgScore: number; count: number }[];
  categoryScores?: { category: string; avgScore: number; count: number }[];
  improvementTrajectory?: string;
  bestPrompts?: PromptRecord[];
  needsImprovementPrompts?: PromptRecord[];
}

/** Entry from ~/.gemini/antigravity-cli/history.jsonl */
export interface HistoryEntry {
  display: string;
  timestamp: number;
  workspace: string;
  conversationId?: string;
  type?: string; // 'slash_command' for /commands
}

/** Conversation identifier with source attribution */
export interface ConversationRef {
  id: string;
  source: AntigravitySource;
  brainDir: string;
}

export interface UsageRecord {
  id?: number;
  session_id?: string;
  source?: AntigravitySource;
  timestamp: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  context_tokens?: number;
  context_window?: number;
  model?: string;
}
