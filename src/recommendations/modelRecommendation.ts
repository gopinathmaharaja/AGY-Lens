import { ModelRecommendation, PromptCategory } from '../types/usage';

export interface ModelRecommendationInput {
  prompt: string;
  category: PromptCategory;
  contextTokens?: number;
  availableModels?: string[];
}

export class ModelRecommendationEngine {
  public static recommend(input: ModelRecommendationInput): ModelRecommendation {
    const { prompt, category, contextTokens = 0, availableModels = [] } = input;
    const lower = prompt.toLowerCase();
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;

    // Detect complexity factors
    let complexityScore = 0; // 0 to 10
    const reasons: string[] = [];

    // Category impact
    if (['Architecture', 'Planning', 'Code Review'].includes(category)) {
      complexityScore += 4;
      reasons.push(`Task type is ${category}, which typically demands high-level structural reasoning.`);
    } else if (['Debugging', 'Refactoring'].includes(category)) {
      complexityScore += 3;
      reasons.push(`${category} requires tracing dependencies and verifying edge cases.`);
    } else if (['Documentation', 'Learning', 'Research'].includes(category)) {
      complexityScore += 1;
      reasons.push('Informational or explanatory task with standard complexity.');
    } else {
      complexityScore += 2;
    }

    // High reasoning keywords
    if (/\b(migrate|redesign|algorithm|concurrency|race condition|deadlock|security|crypto|memory leak)\b/i.test(lower)) {
      complexityScore += 3;
      reasons.push('Contains deep algorithmic, concurrency, or architectural requirements.');
    }

    // Context length impact
    if (contextTokens > 500000) {
      complexityScore += 2;
      reasons.push(`Large context (${Math.round(contextTokens / 1000)}k tokens) requires large-window coherence.`);
    } else if (contextTokens > 150000) {
      complexityScore += 1;
    }

    // Lightweight tasks
    if (/\b(rename|typo|format|quick test|one line|simple regex|comment)\b/i.test(lower) && wordCount < 20) {
      complexityScore = Math.max(1, complexityScore - 4);
      reasons.push('Small scope and simple transformation.');
    }

    let taskComplexity: 'simple' | 'moderate' | 'complex' = 'moderate';
    let recommendedModel = 'Gemini 3.8 Flash (High)';
    let alternativeModels: string[] = ['Gemini 3.8 Flash (Medium)', 'Claude Sonnet 4.6 (Thinking)'];
    let confidence = 75;

    if (complexityScore >= 6) {
      taskComplexity = 'complex';
      confidence = Math.min(95, 70 + complexityScore * 3);

      if (availableModels.some((m) => m.toLowerCase().includes('pro') || m.toLowerCase().includes('opus'))) {
        recommendedModel = availableModels.find((m) => m.toLowerCase().includes('pro') || m.toLowerCase().includes('opus')) || 'Gemini 3.1 Pro (High)';
        alternativeModels = ['Claude Opus 4.6 (Thinking)', 'Gemini 3.8 Flash (High)'];
      } else {
        recommendedModel = 'Gemini 3.8 Flash (High)';
        alternativeModels = ['Claude Sonnet 4.6 (Thinking)', 'Gemini 3.1 Pro (High)'];
      }
      reasons.push('High reasoning capability recommended for multi-step solution and structural synthesis.');
    } else if (complexityScore <= 3) {
      taskComplexity = 'simple';
      confidence = 88;
      recommendedModel = 'Gemini 3.8 Flash (Medium)';
      alternativeModels = ['Gemini 3.8 Flash (Low)', 'Gemini 3.8 Flash (High)'];
      reasons.push('Fast response and low latency model is optimal and saves quota.');
    } else {
      taskComplexity = 'moderate';
      confidence = 80;
      recommendedModel = 'Gemini 3.8 Flash (High)';
      alternativeModels = ['Gemini 3.7 Flash (High)', 'Claude Sonnet 4.6 (Thinking)'];
      reasons.push('Balanced fast reasoning model provides the optimal tradeoff of speed, accuracy, and quota.');
    }

    return {
      recommendedModel,
      alternativeModels,
      confidence,
      reasons,
      taskComplexity
    };
  }
}
