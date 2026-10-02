export interface ModelInfo {
  id: string;
  name: string;
  family: 'gemini' | 'claude' | 'gpt' | 'other';
  reasoningEffort?: 'low' | 'medium' | 'high' | 'max';
  contextWindow: number;
}

export class ModelParser {
  private static readonly KNOWN_MODELS: Record<string, { name: string; contextWindow: number }> = {
    'gemini-3.8-flash-high': { name: 'Gemini 3.8 Flash (High)', contextWindow: 1000000 },
    'gemini-3.8-flash-medium': { name: 'Gemini 3.8 Flash (Medium)', contextWindow: 1000000 },
    'gemini-3.8-flash-low': { name: 'Gemini 3.8 Flash (Low)', contextWindow: 1000000 },
    'gemini-3.7-flash-high': { name: 'Gemini 3.7 Flash (High)', contextWindow: 1000000 },
    'gemini-3.7-flash-medium': { name: 'Gemini 3.7 Flash (Medium)', contextWindow: 1000000 },
    'gemini-3.7-flash-low': { name: 'Gemini 3.7 Flash (Low)', contextWindow: 1000000 },
    'gemini-3.6-flash-high': { name: 'Gemini 3.6 Flash (High)', contextWindow: 1000000 },
    'gemini-3.1-pro-high': { name: 'Gemini 3.1 Pro (High)', contextWindow: 1000000 },
    'gemini-3.1-pro-low': { name: 'Gemini 3.1 Pro (Low)', contextWindow: 1000000 },
    'claude-sonnet-4-6': { name: 'Claude Sonnet 4.6 (Thinking)', contextWindow: 200000 },
    'claude-opus-4-6-thinking': { name: 'Claude Opus 4.6 (Thinking)', contextWindow: 200000 },
    'gpt-oss-120b-medium': { name: 'GPT-OSS 120B (Medium)', contextWindow: 128000 }
  };

  public static normalizeModelName(rawModel?: string): string {
    if (!rawModel) return 'Gemini 3.8 Flash (High)';
    const clean = rawModel.trim();
    if (this.KNOWN_MODELS[clean]) {
      return this.KNOWN_MODELS[clean].name;
    }
    // Check if it already matches a label
    for (const info of Object.values(this.KNOWN_MODELS)) {
      if (info.name.toLowerCase() === clean.toLowerCase()) {
        return info.name;
      }
    }
    return clean;
  }

  public static getContextWindow(modelName: string): number {
    const norm = this.normalizeModelName(modelName);
    for (const [key, val] of Object.entries(this.KNOWN_MODELS)) {
      if (val.name === norm || key === modelName) {
        return val.contextWindow;
      }
    }
    return 1000000;
  }

  public static parseAgyModelsOutput(output: string): ModelInfo[] {
    const models: ModelInfo[] = [];
    const lines = output.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Fetching')) continue;

      const parts = trimmed.split(/\t+|\s{2,}/);
      if (parts.length >= 2) {
        const id = parts[0].trim();
        const name = parts[1].trim();
        let family: 'gemini' | 'claude' | 'gpt' | 'other' = 'other';
        if (id.includes('gemini')) family = 'gemini';
        else if (id.includes('claude')) family = 'claude';
        else if (id.includes('gpt')) family = 'gpt';

        models.push({
          id,
          name,
          family,
          contextWindow: this.getContextWindow(id)
        });
      }
    }

    return models;
  }
}
