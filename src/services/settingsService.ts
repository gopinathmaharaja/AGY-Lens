import * as vscode from 'vscode';

export interface ExtensionSettings {
  enabled: boolean;
  refreshInterval: number;
  retentionPeriodDays: number;
  privacy: {
    storePrompts: boolean;
    storeSourceCode: boolean;
    externalAiAnalysis: boolean;
    secretRedaction: boolean;
  };
  analytics: {
    promptScoring: boolean;
    modelRecommendations: boolean;
    conversationAnalysis: boolean;
    forecasting: boolean;
  };
  ui: {
    statusBar: boolean;
    notifications: boolean;
    contextWarningThreshold: number;
    contextCriticalThreshold: number;
  };
  ai: {
    provider: 'gemini' | 'openai' | 'claude' | 'ollama';
    model: string;
    ollamaEndpoint: string;
  };
}

export class SettingsService {
  private static readonly CONFIG_SECTION = 'antigravity';

  public static getSettings(): ExtensionSettings {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    return {
      enabled: config.get<boolean>('enableExtension', true),
      refreshInterval: config.get<number>('refreshInterval', 30),
      retentionPeriodDays: config.get<number>('retentionPeriodDays', 90),
      privacy: {
        storePrompts: config.get<boolean>('privacy.storePrompts', true),
        storeSourceCode: config.get<boolean>('privacy.storeSourceCode', false),
        externalAiAnalysis: config.get<boolean>('privacy.externalAiAnalysis', false),
        secretRedaction: config.get<boolean>('privacy.secretRedaction', true)
      },
      analytics: {
        promptScoring: config.get<boolean>('analytics.promptScoring', true),
        modelRecommendations: config.get<boolean>('analytics.modelRecommendations', true),
        conversationAnalysis: config.get<boolean>('analytics.conversationAnalysis', true),
        forecasting: config.get<boolean>('analytics.forecasting', true)
      },
      ui: {
        statusBar: config.get<boolean>('ui.statusBar', true),
        notifications: config.get<boolean>('ui.notifications', true),
        contextWarningThreshold: config.get<number>('ui.contextWarningThreshold', 80),
        contextCriticalThreshold: config.get<number>('ui.contextCriticalThreshold', 90)
      },
      ai: {
        provider: config.get<'gemini' | 'openai' | 'claude' | 'ollama'>('ai.provider', 'gemini'),
        model: config.get<string>('ai.model', 'gemini-1.5-flash'),
        ollamaEndpoint: config.get<string>('ai.ollamaEndpoint', 'http://localhost:11434')
      }
    };
  }

  public static async getApiKey(secretStorage: vscode.SecretStorage, provider: string): Promise<string | undefined> {
    return secretStorage.get(`antigravity.apikey.${provider}`);
  }

  public static async setApiKey(secretStorage: vscode.SecretStorage, provider: string, key: string): Promise<void> {
    await secretStorage.store(`antigravity.apikey.${provider}`, key);
  }
}
