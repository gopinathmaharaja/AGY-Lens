import { ConversationTurn } from '../analytics/conversationAnalyzer';

export interface ParsedTranscriptStep {
  stepIndex: number;
  source: string;
  type: string;
  status: string;
  createdAt: string;
  rawContent?: string;
  cleanedUserPrompt?: string;
  detectedModel?: string;
  toolCallsCount: number;
  estimatedTokens: number;
}

export interface ParsedConversation {
  conversationId: string;
  steps: ParsedTranscriptStep[];
  userPrompts: { prompt: string; timestamp: string; stepIndex: number }[];
  currentModel?: string;
  totalEstimatedTokens: number;
  inputTokens: number;
  outputTokens: number;
  agentState: string;
  startedAt: string;
  lastActiveAt: string;
}

export class TranscriptParser {
  public static parseJsonLine(line: string): ParsedTranscriptStep | null {
    if (!line || !line.trim()) return null;
    try {
      const obj = JSON.parse(line);
      const content = typeof obj.content === 'string' ? obj.content : '';
      let cleanedPrompt: string | undefined;
      let detectedModel: string | undefined;

      // Extract user prompt from <USER_REQUEST> if present
      if (obj.source === 'USER_EXPLICIT' || obj.type === 'USER_INPUT') {
        const userReqMatch = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
        if (userReqMatch) {
          cleanedPrompt = userReqMatch[1].trim();
        } else {
          cleanedPrompt = content.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '').trim();
        }

        // Check if model changed in USER_SETTINGS_CHANGE
        const modelMatch = content.match(/`Model Selection` from .*? to (.*?)\.(?:\s*No need|\n|$)/);
        if (modelMatch) {
          detectedModel = modelMatch[1].trim();
        }
      }

      const toolCallsCount = Array.isArray(obj.tool_calls) ? obj.tool_calls.length : 0;
      // Rough token estimation: ~4 chars per token
      const contentLength = content.length;
      const estimatedTokens = Math.max(1, Math.round(contentLength / 4));

      return {
        stepIndex: typeof obj.step_index === 'number' ? obj.step_index : 0,
        source: obj.source || 'UNKNOWN',
        type: obj.type || 'UNKNOWN',
        status: obj.status || 'DONE',
        createdAt: obj.created_at || new Date().toISOString(),
        rawContent: content,
        cleanedUserPrompt: cleanedPrompt,
        detectedModel,
        toolCallsCount,
        estimatedTokens
      };
    } catch {
      return null;
    }
  }

  public static parseAllLines(lines: string[], conversationId: string): ParsedConversation {
    const steps: ParsedTranscriptStep[] = [];
    const userPrompts: { prompt: string; timestamp: string; stepIndex: number }[] = [];
    let currentModel: string | undefined;
    let inputTokens = 0;
    let outputTokens = 0;
    let agentState = 'IDLE';

    for (const line of lines) {
      const step = this.parseJsonLine(line);
      if (!step) continue;
      steps.push(step);

      if (step.detectedModel) {
        currentModel = step.detectedModel;
      }

      if (step.source === 'USER_EXPLICIT' || step.type === 'USER_INPUT') {
        const p = step.cleanedUserPrompt || step.rawContent || '';
        if (p) {
          userPrompts.push({
            prompt: p,
            timestamp: step.createdAt,
            stepIndex: step.stepIndex
          });
        }
        inputTokens += step.estimatedTokens;
      } else if (step.source === 'MODEL') {
        outputTokens += step.estimatedTokens;
      }

      if (step.status === 'RUNNING') {
        agentState = 'RUNNING';
      } else if (step.status === 'ERROR') {
        agentState = 'ERROR';
      } else if (agentState !== 'RUNNING') {
        agentState = 'IDLE';
      }
    }

    const startedAt = steps.length > 0 ? steps[0].createdAt : new Date().toISOString();
    const lastActiveAt = steps.length > 0 ? steps[steps.length - 1].createdAt : startedAt;

    return {
      conversationId,
      steps,
      userPrompts,
      currentModel,
      totalEstimatedTokens: inputTokens + outputTokens,
      inputTokens,
      outputTokens,
      agentState,
      startedAt,
      lastActiveAt
    };
  }

  public static toTurns(steps: ParsedTranscriptStep[]): ConversationTurn[] {
    return steps.map((s) => ({
      stepIndex: s.stepIndex,
      type: s.type,
      source: s.source,
      content: s.cleanedUserPrompt || s.rawContent || '',
      timestamp: s.createdAt
    }));
  }
}
