import { QuotaRecord, UsageRecord } from '../types/usage';

export interface QuotaForecast {
  estimatedUsageUntilReset: number; // percentage or tokens
  hourlyBurnRate: number; // tokens/hour
  estimatedHoursRemaining: number;
  confidence: 'Low' | 'Medium' | 'High';
  isEstimate: boolean;
  advice: string;
}

export class QuotaPredictor {
  public static forecast(recentUsage: UsageRecord[], latestQuota?: QuotaRecord): QuotaForecast {
    if (!recentUsage || recentUsage.length === 0) {
      return {
        estimatedUsageUntilReset: 0,
        hourlyBurnRate: 0,
        estimatedHoursRemaining: 24,
        confidence: 'Low',
        isEstimate: true,
        advice: 'Insufficient usage history to project quota depletion.'
      };
    }

    const totalTokens = recentUsage.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0);
    // Estimate hourly rate over last 1-4 hours
    const hourlyBurnRate = Math.round(totalTokens / Math.max(1, recentUsage.length / 5));

    const currentQuota = latestQuota?.remaining ?? 85;
    const hoursRemaining = Math.max(1, Math.round(currentQuota / Math.max(1, hourlyBurnRate / 10000)));

    let confidence: 'Low' | 'Medium' | 'High' = 'Low';
    if (recentUsage.length > 50) confidence = 'High';
    else if (recentUsage.length > 15) confidence = 'Medium';

    let advice = 'Usage is within normal operating limits.';
    if (currentQuota < 20) {
      advice = 'Quota is low. Consider using faster/smaller models or shorter prompts until reset.';
    } else if (currentQuota < 40) {
      advice = 'Monitor usage frequency. Approaching peak consumption.';
    }

    return {
      estimatedUsageUntilReset: Math.min(100, Math.round(hourlyBurnRate / 500)),
      hourlyBurnRate,
      estimatedHoursRemaining: hoursRemaining,
      confidence,
      isEstimate: true,
      advice
    };
  }
}
