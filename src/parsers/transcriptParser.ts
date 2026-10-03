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

export interface ParsedUserPrompt {
  prompt: string;
  timestamp: string;
  stepIndex: number;
  inputTokens: number;
  outputTokens: number;
  wordCount: number;
}

export interface ParsedConversation {
  conversationId: string;
  steps: ParsedTranscriptStep[];
  userPrompts: ParsedUserPrompt[];
  currentModel?: string;
  totalEstimatedTokens: number;
  inputTokens: number;
  outputTokens: number;
  agentState: string;
  startedAt: string;
  lastActiveAt: string;
}

export class TranscriptParser {
  /**
   * Cleans text before token estimation:
   * Strips large system XML envelopes, metadata headers, and keeps the core textual content.
   */
  public static cleanContentForTokenEstimation(content: string): string {
    if (!content) return '';
    return content
      .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
      .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '')
      .replace(/<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>/g, '')
      .replace(/<\/?(?:USER_REQUEST|system_prompt|developer|instructions)>/gi, '')
      .trim();
  }

  /**
   * Token estimation: ~3.8 characters per token for English & code
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    const cleaned = this.cleanContentForTokenEstimation(text);
    if (!cleaned) return 0;
    return Math.max(1, Math.round(cleaned.length / 3.8));
  }

  public static parseJsonLine(line: string): ParsedTranscriptStep | null {
    if (!line || !line.trim()) return null;
    try {
      const obj = JSON.parse(line);
      const content = typeof obj.content === 'string' ? obj.content : '';
      const thinking = typeof obj.thinking === 'string' ? obj.thinking : '';
      let cleanedPrompt: string | undefined;
      let detectedModel: string | undefined;

      // Extract user prompt from <USER_REQUEST> if present
      if (obj.source === 'USER_EXPLICIT' || obj.type === 'USER_INPUT') {
        const userReqMatch = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
        if (userReqMatch) {
          cleanedPrompt = userReqMatch[1].trim();
        } else {
          cleanedPrompt = content
            .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
            .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '')
            .replace(/<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>/g, '')
            .replace(/<[^>]+>/g, '')
            .trim();
        }

        // Check if model changed in USER_SETTINGS_CHANGE
        const modelMatch = content.match(/`Model Selection` from .*? to (.*?)\.(?:\s*No need|\n|$)/);
        if (modelMatch) {
          detectedModel = modelMatch[1].trim();
        }
      }

      const toolCallsCount = Array.isArray(obj.tool_calls) ? obj.tool_calls.length : 0;
      
      // Calculate token estimate using cleaned content plus thinking tokens
      const textToEstimate = (obj.source === 'USER_EXPLICIT' || obj.type === 'USER_INPUT')
        ? (cleanedPrompt || content)
        : (content + (thinking ? '\n' + thinking : ''));

      const estimatedTokens = this.estimateTokens(textToEstimate);

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
    let currentModel: string | undefined;
    let agentState = 'IDLE';

    for (const line of lines) {
      const step = this.parseJsonLine(line);
      if (!step) continue;
      steps.push(step);

      if (step.detectedModel) {
        currentModel = step.detectedModel;
      }

      if (step.status === 'RUNNING') {
        agentState = 'RUNNING';
      } else if (step.status === 'ERROR') {
        agentState = 'ERROR';
      } else if (agentState !== 'RUNNING') {
        agentState = 'IDLE';
      }
    }

    // Associate output tokens with each prompt:
    // A prompt's outputTokens is the sum of model tokens between this prompt and the next user prompt
    const userPrompts: ParsedUserPrompt[] = [];
    let inputTokens = 0;
    let outputTokens = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.source === 'USER_EXPLICIT' || step.type === 'USER_INPUT') {
        const p = step.cleanedUserPrompt || step.rawContent || '';
        if (p) {
          const promptInputTokens = step.estimatedTokens;
          inputTokens += promptInputTokens;

          // Find following model output steps until next USER_INPUT
          let promptOutputTokens = 0;
          for (let j = i + 1; j < steps.length; j++) {
            const nextStep = steps[j];
            if (nextStep.source === 'USER_EXPLICIT' || nextStep.type === 'USER_INPUT') {
              break;
            }
            if (nextStep.source === 'MODEL') {
              promptOutputTokens += nextStep.estimatedTokens;
            }
          }
          outputTokens += promptOutputTokens;

          const words = p.split(/\s+/).filter(Boolean).length;

          userPrompts.push({
            prompt: p,
            timestamp: step.createdAt,
            stepIndex: step.stepIndex,
            inputTokens: promptInputTokens,
            outputTokens: promptOutputTokens,
            wordCount: words
          });
        }
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
